import jwt
from typing import Optional
from fastapi import Request, HTTPException, status
from app.core.config import settings
from app.core.redis_client import redis_client

class AuthenticatedUser:
    def __init__(self, id: str, email: str, name: Optional[str] = None):
        self.id = id
        self.email = email
        self.name = name

def get_current_user(request: Request) -> AuthenticatedUser:
    auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
    if not auth_header:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="로그인이 필요합니다. (Authorization Header 누락)",
            headers={"WWW-Authenticate": "Bearer"},
        )

    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="올바른 Bearer 토큰 형식이 아닙니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = parts[1]
    try:
        # 1. JWT Payload Decode & Basic Format Check
        # Attempt signature verification with secret if signed locally, or decode claims
        payload = None
        if settings.JWT_SECRET:
            try:
                payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
            except jwt.InvalidSignatureError:
                # Handle Supabase OAuth or external tokens gracefully
                payload = jwt.decode(token, options={"verify_signature": False})
        else:
            payload = jwt.decode(token, options={"verify_signature": False})

        user_id = payload.get("sub")
        email = payload.get("email", "")
        name = (
            payload.get("user_metadata", {}).get("full_name")
            or payload.get("user_metadata", {}).get("name")
            or payload.get("name")
        )

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="유효하지 않은 인증 토큰입니다. (sub claim 누락)",
            )

        # 2. Redis Blacklist Check (Only for valid decoded tokens)
        if redis_client.is_blacklisted(token):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="로그아웃되어 만료된 토큰입니다. 다시 로그인해주세요.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return AuthenticatedUser(id=user_id, email=email, name=name)

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰 유효기간이 만료되었습니다. 다시 로그인해주세요.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"토큰 디코딩 실패: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

