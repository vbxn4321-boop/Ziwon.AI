import uuid
import hashlib
import secrets
import jwt
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from sqlalchemy import text
from app.core.database import SessionLocal
from app.core.config import settings
from app.core.redis_client import redis_client

router = APIRouter()

import bcrypt

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(12)).decode("utf-8")

def verify_password(stored_password: str, provided_password: str) -> bool:
    if not stored_password:
        return False
    # 1. Bcrypt verification
    if stored_password.startswith(("$2a$", "$2b$", "$2y$")):
        try:
            return bcrypt.checkpw(provided_password.encode("utf-8"), stored_password.encode("utf-8"))
        except Exception:
            return False
    # 2. PBKDF2 verification (backward compatibility)
    if ":" in stored_password:
        salt, hashed = stored_password.split(":", 1)
        check_hashed = hashlib.pbkdf2_hmac("sha256", provided_password.encode("utf-8"), salt.encode("utf-8"), 100000).hex()
        return hmac_equal(hashed, check_hashed)
    return False

def hmac_equal(a: str, b: str) -> bool:
    return secrets.compare_digest(a, b)

def create_access_token(user_id: str, email: str, name: Optional[str] = None) -> str:
    if not settings.JWT_SECRET:
        raise ValueError("JWT_SECRET 환경변수가 설정되지 않았습니다.")
    payload = {
        "sub": user_id,
        "email": email,
        "name": name,
        "role": "USER",
        "type": "access",
        "exp": datetime.utcnow() + timedelta(minutes=30),  # 30-minute Short-Lived Access Token
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    if not settings.JWT_SECRET:
        raise ValueError("JWT_SECRET 환경변수가 설정되지 않았습니다.")
    payload = {
        "sub": user_id,
        "type": "refresh",
        "jti": str(uuid.uuid4()),
        "exp": datetime.utcnow() + timedelta(days=30),  # 30-day Long-Lived Refresh Token
    }
    refresh_token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    # Save to Redis with 30-day TTL
    redis_client.save_refresh_token(user_id, refresh_token, ttl=30 * 86400)
    return refresh_token

# Schemas
class SendOtpRequest(BaseModel):
    email: str

class VerifyOtpRequest(BaseModel):
    email: str
    code: str

class SignUpRequest(BaseModel):
    email: str
    password: str
    fullName: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class RefreshTokenRequest(BaseModel):
    refreshToken: str

@router.post("/send-otp", summary="이메일 6자리 인증번호 발송 (Redis 3분 TTL)")
def send_otp(req: SendOtpRequest):
    email = req.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="올바른 이메일 주소를 입력해주세요.")

    code = f"{secrets.randbelow(900000) + 100000}"  # 6자리 난수
    success, error_msg = redis_client.save_otp(email, code, ttl=180)
    if not success:
        status_code = 429 if error_msg and "초 후" in error_msg else 500
        raise HTTPException(status_code=status_code, detail=error_msg or "인증번호 발송 실패")

    print(f"\n[EMAIL OTP] >> 발송 대상: {email} | 인증번호: [{code}] (Redis 3분 TTL / 60초 쿨다운 적용)\n")
    return {
        "success": True,
        "message": f"인증번호가 {email} 주소로 발송되었습니다. (유효시간: 3분)",
    }

@router.post("/verify-otp", summary="이메일 6자리 인증번호 확인 (Redis)")
def verify_otp(req: VerifyOtpRequest):
    email = req.email.strip().lower()
    success, error_msg = redis_client.verify_otp(email, req.code)
    if not success:
        raise HTTPException(status_code=400, detail=error_msg or "인증번호가 일치하지 않습니다.")

    return {"success": True, "message": "이메일 인증이 성공적으로 완료되었습니다."}

@router.post("/signup", summary="이메일 회원가입 및 이중 토큰(Access + Refresh) 발급")
def signup(req: SignUpRequest):
    email = req.email.strip().lower()
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="비밀번호는 최소 6자 이상이어야 합니다.")

    # Redis OTP 인증 완료 여부 확인
    if not redis_client.is_otp_verified(email):
        raise HTTPException(status_code=403, detail="이메일 인증이 완료되지 않았습니다. 먼저 이메일 인증을 진행해주세요.")

    db = SessionLocal()
    try:
        # Check existing user
        existing = db.execute(text('SELECT "id" FROM "User" WHERE "email" = :email'), {"email": email}).fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="이미 가입된 이메일 주소입니다. 로그인해주세요.")

        user_id = str(uuid.uuid4())
        hashed_pwd = hash_password(req.password)
        name = req.fullName or email.split("@")[0]

        db.execute(
            text("""
            INSERT INTO "User" ("id", "email", "passwordHash", "name", "role", "createdAt", "updatedAt")
            VALUES (:id, :email, :passwordHash, :name, 'USER', NOW(), NOW())
            """),
            {"id": user_id, "email": email, "passwordHash": hashed_pwd, "name": name}
        )
        db.commit()

        # OTP 인증 완료 상태 소모
        redis_client.clear_otp_verified(email)

        access_token = create_access_token(user_id=user_id, email=email, name=name)
        refresh_token = create_refresh_token(user_id=user_id)
        return {
            "success": True,
            "accessToken": access_token,
            "refreshToken": refresh_token,
            "tokenType": "Bearer",
            "expiresIn": 1800,  # 30 minutes in seconds
            "user": {
                "id": user_id,
                "email": email,
                "name": name,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"회원가입 실패: {str(e)}")
    finally:
        db.close()

@router.post("/login", summary="이메일 로그인 및 이중 토큰(Access + Refresh) 발급")
def login(req: LoginRequest):
    email = req.email.strip().lower()
    if not req.password:
        raise HTTPException(status_code=400, detail="비밀번호를 입력해주세요.")

    db = SessionLocal()
    try:
        row = db.execute(
            text('SELECT "id", "email", "name", "role", "passwordHash" FROM "User" WHERE "email" = :email'),
            {"email": email}
        ).fetchone()

        if not row:
            raise HTTPException(status_code=401, detail="가입되지 않은 이메일 주소입니다. 먼저 회원가입을 해주세요.")

        stored_hash = row[4]
        if not stored_hash:
            raise HTTPException(
                status_code=401,
                detail="비밀번호가 등록되지 않은 초기 계정입니다. '이메일 인증(OTP)'을 통해 신규 가입하시거나 비밀번호를 등록해주세요."
            )

        if not verify_password(stored_hash, req.password):
            raise HTTPException(status_code=401, detail="비밀번호가 일치하지 않습니다.")

        user_id = row[0]
        user_email = row[1]
        user_name = row[2]

        access_token = create_access_token(user_id=user_id, email=user_email, name=user_name)
        refresh_token = create_refresh_token(user_id=user_id)
        return {
            "success": True,
            "accessToken": access_token,
            "refreshToken": refresh_token,
            "tokenType": "Bearer",
            "expiresIn": 1800,  # 30 minutes in seconds
            "user": {
                "id": user_id,
                "email": user_email,
                "name": user_name,
            },
        }
    finally:
        db.close()

@router.post("/refresh", summary="Access Token 및 Refresh Token 자동 갱신 (RTR)")
def refresh_token_endpoint(req: RefreshTokenRequest):
    raw_refresh = req.refreshToken.strip()
    if not raw_refresh:
        raise HTTPException(status_code=400, detail="리프레시 토큰이 전달되지 않았습니다.")

    try:
        payload = jwt.decode(raw_refresh, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="리프레시 토큰이 만료되었습니다. 다시 로그인해주세요.")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="유효하지 않은 리프레시 토큰입니다.")

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="토큰 타입이 일치하지 않습니다. (Refresh Token 필요)")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="토큰에 유저 식별자가 누락되었습니다.")

    # Validate against active token in Redis
    if not redis_client.validate_refresh_token(user_id, raw_refresh):
        raise HTTPException(
            status_code=401,
            detail="만료되었거나 이미 사용된 리프레시 토큰입니다. 다시 로그인해주세요.",
        )

    # Fetch latest user details from DB
    db = SessionLocal()
    try:
        user_row = db.execute(
            text('SELECT "id", "email", "name" FROM "User" WHERE "id" = :id'),
            {"id": user_id}
        ).fetchone()

        if not user_row:
            raise HTTPException(status_code=404, detail="사용자 정보를 찾을 수 없습니다.")

        email = user_row[1]
        name = user_row[2]

        # Issue new Access Token (30m) & Rotated Refresh Token (30d) - Refresh Token Rotation (RTR)
        new_access_token = create_access_token(user_id=user_id, email=email, name=name)
        new_refresh_token = create_refresh_token(user_id=user_id)

        print(f"[Redis RTR] Token refreshed & rotated successfully for user: {email}")
        return {
            "success": True,
            "accessToken": new_access_token,
            "refreshToken": new_refresh_token,
            "tokenType": "Bearer",
            "expiresIn": 1800,
        }
    finally:
        db.close()

@router.post("/reset-password", summary="비밀번호 재설정 (OTP 인증 완료 필수)")
def reset_password(req: LoginRequest):
    email = req.email.strip().lower()
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="비밀번호는 최소 6자 이상이어야 합니다.")

    if not redis_client.is_otp_verified(email):
        raise HTTPException(status_code=403, detail="이메일 인증이 완료되지 않았습니다. 먼저 이메일 인증을 진행해주세요.")

    db = SessionLocal()
    try:
        user_row = db.execute(
            text('SELECT "id", "email", "name" FROM "User" WHERE "email" = :email'),
            {"email": email}
        ).fetchone()

        if not user_row:
            raise HTTPException(status_code=404, detail="가입되지 않은 이메일 주소입니다.")

        user_id, email_val, name_val = user_row[0], user_row[1], user_row[2]
        hashed_pwd = hash_password(req.password)

        db.execute(
            text('UPDATE "User" SET "passwordHash" = :passwordHash, "updatedAt" = NOW() WHERE "email" = :email'),
            {"passwordHash": hashed_pwd, "email": email}
        )
        db.commit()

        # OTP 완료 상태 소모
        redis_client.clear_otp_verified(email)

        access_token = create_access_token(user_id=user_id, email=email_val, name=name_val)
        refresh_token = create_refresh_token(user_id=user_id)
        return {
            "success": True,
            "message": "비밀번호가 성공적으로 변경되었습니다.",
            "accessToken": access_token,
            "refreshToken": refresh_token,
            "tokenType": "Bearer",
            "expiresIn": 1800,
            "user": {
                "id": user_id,
                "email": email_val,
                "name": name_val,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"비밀번호 재설정 실패: {str(e)}")
    finally:
        db.close()

@router.post("/logout", summary="로그아웃 (Access Token 블랙리스트 및 Redis Refresh Token 파기)")
def logout(request: Request):
    auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
    if auth_header:
        parts = auth_header.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]
            try:
                payload = jwt.decode(token, options={"verify_signature": False})
                exp = payload.get("exp")
                user_id = payload.get("sub")
                if exp:
                    redis_client.add_to_blacklist(token, exp_timestamp=exp)
                if user_id:
                    redis_client.delete_refresh_token(user_id)
                print(f"[Redis Logout] Access token blacklisted & Refresh token destroyed for user: {user_id}")
            except Exception as e:
                print(f"[Redis Logout Warning] Failed to parse token: {e}")

    return {"success": True, "message": "성공적으로 로그아웃되었습니다."}



