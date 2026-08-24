import time
import logging
from typing import Optional, Tuple
from app.core.config import settings

logger = logging.getLogger("redis_client")

try:
    import redis
except ImportError:
    redis = None

class RedisManager:
    """
    Ziwon.AI Redis Client Manager
    - Production: Requires healthy Redis instance (Fail-Safe)
    - Development: Safe in-memory fallback with clear logs
    - Key Namespacing: ziwon:otp:{email}, ziwon:bl:{token}
    """

    def __init__(self):
        self._client: Optional[redis.Redis] = None
        self._memory_store: dict = {}  # Local dev fallback only
        self._init_connection()

    def _init_connection(self):
        if not settings.REDIS_URL:
            if settings.ENVIRONMENT == "production":
                logger.error("[Redis] REDIS_URL is not set in production!")
            return

        try:
            self._client = redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_timeout=3.0,
                socket_connect_timeout=3.0,
                health_check_interval=30,
            )
            # Test ping
            self._client.ping()
            print(f"[Redis] Successfully connected to Redis ({settings.REDIS_URL.split('@')[-1] if '@' in settings.REDIS_URL else 'localhost'})")
        except Exception as e:
            self._client = None
            if settings.ENVIRONMENT == "production":
                logger.error(f"[Redis CRITICAL] Failed to connect to Redis in production: {e}")
            else:
                print(f"[Redis DEV NOTICE] Redis not reachable ({e}). Using development in-memory fallback.")

    def is_connected(self) -> bool:
        if self._client:
            try:
                return self._client.ping()
            except Exception:
                return False
        return False

    # -------------------------------------------------------------
    # 1. OTP Management (with 60s Rate-Limit & 3-min TTL)
    # -------------------------------------------------------------
    def save_otp(self, email: str, code: str, ttl: int = 180) -> Tuple[bool, Optional[str]]:
        """
        Saves OTP with 180s TTL and 60s cooldown limit.
        Returns: (success: bool, error_message: Optional[str])
        """
        clean_email = email.strip().lower()
        key = f"ziwon:otp:{clean_email}"

        # Production Guard
        if settings.ENVIRONMENT == "production" and not self.is_connected():
            return False, "Redis 캐시 서버에 연결할 수 없습니다. 관리자에게 문의하세요."

        if self._client:
            try:
                # 60-second cooldown check: if remaining TTL > 120 (of 180), prevent spam
                remaining_ttl = self._client.ttl(key)
                if remaining_ttl > (ttl - 60):
                    wait_seconds = remaining_ttl - (ttl - 60)
                    return False, f"인증번호가 이미 발송되었습니다. {wait_seconds}초 후에 다시 요청해주세요."

                self._client.setex(key, ttl, code)
                return True, None
            except Exception as e:
                if settings.ENVIRONMENT == "production":
                    return False, f"OTP 저장 실패: {str(e)}"

        # Development Fallback Store
        now = time.time()
        existing = self._memory_store.get(key)
        if existing and (existing["expires_at"] - now) > (ttl - 60):
            wait_seconds = int((existing["expires_at"] - now) - (ttl - 60))
            return False, f"인증번호가 이미 발송되었습니다. {wait_seconds}초 후에 다시 요청해주세요."

        self._memory_store[key] = {
            "code": code,
            "expires_at": now + ttl,
        }
        return True, None

    def verify_otp(self, email: str, input_code: str) -> Tuple[bool, Optional[str]]:
        """
        Verifies input OTP code. If correct, deletes OTP and marks verified for 10 minutes.
        """
        clean_email = email.strip().lower()
        otp_key = f"ziwon:otp:{clean_email}"
        verified_key = f"ziwon:otp_verified:{clean_email}"

        if settings.ENVIRONMENT == "production" and not self.is_connected():
            return False, "Redis 캐시 서버에 연결할 수 없습니다."

        if self._client:
            try:
                stored_code = self._client.get(otp_key)
                if not stored_code:
                    return False, "인증번호가 만료되었거나 발송되지 않았습니다. 다시 발송해주세요."

                if stored_code != input_code.strip():
                    return False, "인증번호가 일치하지 않습니다."

                # Success: delete OTP key & mark verified in Redis for 10 minutes (600s)
                self._client.delete(otp_key)
                self._client.setex(verified_key, 600, "true")
                return True, None
            except Exception as e:
                if settings.ENVIRONMENT == "production":
                    return False, f"인증 검증 실패: {str(e)}"

        # Development Fallback Store
        now = time.time()
        stored = self._memory_store.get(otp_key)
        if not stored:
            return False, "인증번호가 만료되었거나 발송되지 않았습니다. 다시 발송해주세요."

        if now > stored["expires_at"]:
            self._memory_store.pop(otp_key, None)
            return False, "인증번호가 만료되었습니다. 다시 발송해주세요."

        if stored["code"] != input_code.strip():
            return False, "인증번호가 일치하지 않습니다."

        self._memory_store.pop(otp_key, None)
        self._memory_store[verified_key] = {"expires_at": now + 600}
        return True, None

    def is_otp_verified(self, email: str) -> bool:
        """
        Checks whether this email has successfully completed OTP verification within last 10 mins.
        """
        clean_email = email.strip().lower()
        verified_key = f"ziwon:otp_verified:{clean_email}"

        if self._client:
            try:
                return bool(self._client.exists(verified_key))
            except Exception:
                pass

        # Dev Fallback
        stored = self._memory_store.get(verified_key)
        if stored and time.time() <= stored["expires_at"]:
            return True
        return False

    def clear_otp_verified(self, email: str):
        """
        Consumes the verified status after successful user creation/signup.
        """
        clean_email = email.strip().lower()
        verified_key = f"ziwon:otp_verified:{clean_email}"
        if self._client:
            try:
                self._client.delete(verified_key)
            except Exception:
                pass
        self._memory_store.pop(verified_key, None)

    # -------------------------------------------------------------
    # 2. JWT Blacklist & Logout (Precise Remaining TTL)
    # -------------------------------------------------------------
    def add_to_blacklist(self, token: str, exp_timestamp: int) -> bool:
        """
        Adds JWT token to blacklist for the exact remaining duration (exp - now).
        """
        now = int(time.time())
        remaining_ttl = max(1, exp_timestamp - now)
        key = f"ziwon:bl:{token}"

        if self._client:
            try:
                self._client.setex(key, remaining_ttl, "revoked")
                return True
            except Exception as e:
                logger.error(f"[Redis Blacklist] Failed to blacklist token: {e}")
                if settings.ENVIRONMENT == "production":
                    return False

        # Dev Fallback
        self._memory_store[key] = {"expires_at": time.time() + remaining_ttl}
        return True

    def is_blacklisted(self, token: str) -> bool:
        """
        O(1) lookup to check if token was revoked.
        """
        key = f"ziwon:bl:{token}"

        if self._client:
            try:
                return bool(self._client.exists(key))
            except Exception:
                pass

        # Dev Fallback
        stored = self._memory_store.get(key)
        if stored and time.time() <= stored["expires_at"]:
            return True
        return False

    # -------------------------------------------------------------
    # 3. Refresh Token Management (30-day TTL & RTR)
    # -------------------------------------------------------------
    def save_refresh_token(self, user_id: str, refresh_token: str, ttl: int = 2592000) -> bool:
        """
        Saves user's active refresh token with 30-day TTL (2,592,000s).
        """
        key = f"ziwon:refresh:{user_id}"

        if self._client:
            try:
                self._client.setex(key, ttl, refresh_token)
                return True
            except Exception as e:
                logger.error(f"[Redis Refresh] Failed to save refresh token: {e}")
                if settings.ENVIRONMENT == "production":
                    return False

        # Dev Fallback
        self._memory_store[key] = {
            "token": refresh_token,
            "expires_at": time.time() + ttl,
        }
        return True

    def validate_refresh_token(self, user_id: str, input_refresh_token: str) -> bool:
        """
        Validates whether the provided refresh token matches the active token in Redis.
        """
        key = f"ziwon:refresh:{user_id}"

        if self._client:
            try:
                stored = self._client.get(key)
                return stored == input_refresh_token
            except Exception:
                if settings.ENVIRONMENT == "production":
                    return False

        # Dev Fallback
        stored_item = self._memory_store.get(key)
        if stored_item and time.time() <= stored_item["expires_at"]:
            return stored_item["token"] == input_refresh_token
        return False

    def delete_refresh_token(self, user_id: str) -> bool:
        """
        Deletes active refresh token on logout or session invalidation.
        """
        key = f"ziwon:refresh:{user_id}"
        if self._client:
            try:
                self._client.delete(key)
                return True
            except Exception:
                pass
        self._memory_store.pop(key, None)
        return True


redis_client = RedisManager()

