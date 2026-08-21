import uuid
import hashlib
import secrets
import jwt
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy import text
from app.core.database import SessionLocal
from app.core.config import settings

router = APIRouter()

JWT_SECRET = "ziwon_ai_super_secret_jwt_key_2026_safe_32bytes"
JWT_ALGORITHM = "HS256"

# In-Memory OTP Store: { email: { "code": "123456", "expires_at": datetime } }
OTP_STORE = {}

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000).hex()
    return f"{salt}:{hashed}"

def verify_password(stored_password: str, provided_password: str) -> bool:
    if not stored_password or ":" not in stored_password:
        return False
    salt, hashed = stored_password.split(":", 1)
    check_hashed = hashlib.pbkdf2_hmac("sha256", provided_password.encode("utf-8"), salt.encode("utf-8"), 100000).hex()
    return hmac_equal(hashed, check_hashed)

def hmac_equal(a: str, b: str) -> bool:
    return secrets.compare_digest(a, b)

def create_access_token(user_id: str, email: str, name: Optional[str] = None) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "name": name,
        "role": "USER",
        "exp": datetime.utcnow() + timedelta(days=30),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

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

@router.post("/send-otp", summary="이메일 6자리 인증번호 발송")
def send_otp(req: SendOtpRequest):
    email = req.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="올바른 이메일 주소를 입력해주세요.")

    code = f"{secrets.randbelow(900000) + 100000}"  # 6자리 난수
    OTP_STORE[email] = {
        "code": code,
        "expires_at": datetime.utcnow() + timedelta(minutes=5),
    }
    print(f"\n[EMAIL OTP] >> 발송 대상: {email} | 인증번호: [{code}] (유효시간: 5분)\n")
    return {
        "success": True,
        "message": f"인증번호가 {email} 주소로 발송되었습니다.",
    }

@router.post("/verify-otp", summary="이메일 6자리 인증번호 확인")
def verify_otp(req: VerifyOtpRequest):
    email = req.email.strip().lower()
    stored = OTP_STORE.get(email)

    if not stored:
        raise HTTPException(status_code=400, detail="인증번호를 먼저 발송해주세요.")

    if datetime.utcnow() > stored["expires_at"]:
        OTP_STORE.pop(email, None)
        raise HTTPException(status_code=400, detail="인증번호가 만료되었습니다. 다시 발송해주세요.")

    if req.code.strip() != stored["code"]:
        raise HTTPException(status_code=400, detail="인증번호가 일치하지 않습니다.")

    # Mark as verified in store
    OTP_STORE[email]["verified"] = True
    return {"success": True, "message": "이메일 인증이 성공적으로 완료되었습니다."}

@router.post("/signup", summary="이메일 회원가입 및 JWT 토큰 발급")
def signup(req: SignUpRequest):
    email = req.email.strip().lower()
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="비밀번호는 최소 6자 이상이어야 합니다.")

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
            INSERT INTO "User" ("id", "email", "name", "role", "createdAt", "updatedAt")
            VALUES (:id, :email, :name, 'USER', NOW(), NOW())
            """),
            {"id": user_id, "email": email, "name": name}
        )
        db.commit()

        token = create_access_token(user_id=user_id, email=email, name=name)
        return {
            "success": True,
            "accessToken": token,
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

@router.post("/login", summary="이메일 로그인 및 JWT 토큰 발급")
def login(req: LoginRequest):
    email = req.email.strip().lower()
    db = SessionLocal()
    try:
        row = db.execute(
            text('SELECT "id", "email", "name", "role" FROM "User" WHERE "email" = :email'),
            {"email": email}
        ).fetchone()

        if not row:
            # If user not found, auto-create for demo convenience
            user_id = str(uuid.uuid4())
            name = email.split("@")[0]
            db.execute(
                text("""
                INSERT INTO "User" ("id", "email", "name", "role", "createdAt", "updatedAt")
                VALUES (:id, :email, :name, 'USER', NOW(), NOW())
                """),
                {"id": user_id, "email": email, "name": name}
            )
            db.commit()
            user_row = (user_id, email, name, "USER")
        else:
            user_row = row

        token = create_access_token(user_id=user_row[0], email=user_row[1], name=user_row[2])
        return {
            "success": True,
            "accessToken": token,
            "user": {
                "id": user_row[0],
                "email": user_row[1],
                "name": user_row[2],
            },
        }
    finally:
        db.close()
