"""
E2E Integration Test Suite for Redis-backed Dual Token Authentication & Session Lifecycle
- OTP Rate-Limiting & Expiration
- Short-Lived Access Token (30m) & Long-Lived Refresh Token (30d) in Redis
- Refresh Token Rotation (RTR) via /api/v1/auth/refresh
- Logout with Access Token Blacklist & Refresh Token Revocation
"""

import sys
import os
import time

# Windows terminal UTF-8 encoding support
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from fastapi.testclient import TestClient
from main import app
from app.core.redis_client import redis_client
from app.core.config import settings

client = TestClient(app)

def run_tests():
    print("=" * 65)
    print("🚀 Starting Ziwon.AI Production Dual-Token (Access + Refresh) E2E Tests")
    print(f"   Environment: {settings.ENVIRONMENT}")
    print(f"   Redis Connected: {redis_client.is_connected()}")
    print("=" * 65)

    test_email = f"test_dual_{int(time.time())}@ziwon.ai"

    # -------------------------------------------------------------
    # 1. OTP 발송 테스트 (3분 TTL)
    # -------------------------------------------------------------
    print("\n[Step 1] Testing OTP Generation (3-min TTL)...")
    res = client.post("/api/v1/auth/send-otp", json={"email": test_email})
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    print(f"   ✅ OTP successfully sent: {res.json()['message']}")

    # -------------------------------------------------------------
    # 2. OTP 60초 재발송 쿨다운 (Rate-Limit) 테스트
    # -------------------------------------------------------------
    print("\n[Step 2] Testing 60-Second Cooldown (Rate-Limit)...")
    res_spam = client.post("/api/v1/auth/send-otp", json={"email": test_email})
    assert res_spam.status_code == 429, f"Expected 429, got {res_spam.status_code}: {res_spam.text}"
    print(f"   ✅ Spam request correctly blocked: {res_spam.json()['detail']}")

    # -------------------------------------------------------------
    # 3. OTP 정상 검증 테스트
    # -------------------------------------------------------------
    print("\n[Step 3] Testing Valid OTP Verification...")
    otp_code = None
    if redis_client._client:
        otp_code = redis_client._client.get(f"ziwon:otp:{test_email}")
    else:
        otp_code = redis_client._memory_store.get(f"ziwon:otp:{test_email}", {}).get("code")

    assert otp_code is not None, "Failed to retrieve generated OTP code"
    res_valid = client.post("/api/v1/auth/verify-otp", json={"email": test_email, "code": otp_code})
    assert res_valid.status_code == 200, f"Expected 200, got {res_valid.status_code}: {res_valid.text}"
    assert redis_client.is_otp_verified(test_email) is True
    print(f"   ✅ Valid OTP verified: {res_valid.json()['message']}")

    # -------------------------------------------------------------
    # 4. 회원가입 및 이중 토큰 (Access + Refresh) 발급 테스트
    # -------------------------------------------------------------
    print("\n[Step 4] Testing Signup with Dual Token (Access + Refresh)...")
    res_signup = client.post("/api/v1/auth/signup", json={
        "email": test_email,
        "password": "Password123!",
        "fullName": "Dual Token User",
    })
    assert res_signup.status_code == 200, f"Expected 200, got {res_signup.status_code}: {res_signup.text}"
    data = res_signup.json()
    access_token_1 = data.get("accessToken")
    refresh_token_1 = data.get("refreshToken")
    user_id = data.get("user", {}).get("id")

    assert access_token_1, "No accessToken returned"
    assert refresh_token_1, "No refreshToken returned"
    assert user_id, "No user_id returned"
    print(f"   ✅ Dual tokens issued successfully!")
    print(f"      - Access Token (30m):  {access_token_1[:25]}...")
    print(f"      - Refresh Token (30d): {refresh_token_1[:25]}...")

    # Verify Refresh Token is stored in Redis
    assert redis_client.validate_refresh_token(user_id, refresh_token_1) is True
    print(f"   ✅ Refresh Token safely stored in Redis for user [{user_id}]")

    # -------------------------------------------------------------
    # 5. Access Token으로 보호된 API 접근 테스트
    # -------------------------------------------------------------
    print("\n[Step 5] Testing Authenticated API Access with Access Token...")
    res_api = client.get("/api/v1/companies/me", headers={"Authorization": f"Bearer {access_token_1}"})
    assert res_api.status_code in (200, 404), f"Expected 200/404, got {res_api.status_code}: {res_api.text}"
    print(f"   ✅ API access verified (Status: {res_api.status_code})")

    # -------------------------------------------------------------
    # 6. Refresh Token Rotation (RTR) 갱신 테스트 (/api/v1/auth/refresh)
    # -------------------------------------------------------------
    print("\n[Step 6] Testing Token Refresh & Rotation (RTR via /refresh)...")
    res_refresh = client.post("/api/v1/auth/refresh", json={"refreshToken": refresh_token_1})
    assert res_refresh.status_code == 200, f"Expected 200, got {res_refresh.status_code}: {res_refresh.text}"
    refresh_data = res_refresh.json()

    access_token_2 = refresh_data.get("accessToken")
    refresh_token_2 = refresh_data.get("refreshToken")
    assert access_token_2 and refresh_token_2
    assert refresh_token_2 != refresh_token_1, "Refresh token should be rotated"

    print(f"   ✅ Token successfully refreshed and rotated!")
    print(f"      - New Access Token:  {access_token_2[:25]}...")
    print(f"      - New Refresh Token: {refresh_token_2[:25]}...")

    # -------------------------------------------------------------
    # 7. 이전 Refresh Token 재사용 차단 테스트 (RTR 보안 방어)
    # -------------------------------------------------------------
    print("\n[Step 7] Testing Replay Attack Defense (Old Refresh Token Blocked)...")
    res_replay = client.post("/api/v1/auth/refresh", json={"refreshToken": refresh_token_1})
    assert res_replay.status_code == 401, f"Expected 401, got {res_replay.status_code}: {res_replay.text}"
    print(f"   🛡️ Replayed old refresh token strictly blocked (401): {res_replay.json()['detail']}")

    # -------------------------------------------------------------
    # 8. 새로 발급된 Access Token으로 API 접근 테스트
    # -------------------------------------------------------------
    print("\n[Step 8] Testing API Access with Rotated Access Token...")
    res_api_new = client.get("/api/v1/companies/me", headers={"Authorization": f"Bearer {access_token_2}"})
    assert res_api_new.status_code in (200, 404)
    print(f"   ✅ Rotated Access Token works perfectly (Status: {res_api_new.status_code})")

    # -------------------------------------------------------------
    # 9. 로그아웃 (Access Token 블랙리스트 + Refresh Token 영구 파기)
    # -------------------------------------------------------------
    print("\n[Step 9] Testing Logout (Blacklist Access Token + Destroy Refresh Token)...")
    res_logout = client.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {access_token_2}"})
    assert res_logout.status_code == 200
    assert redis_client.is_blacklisted(access_token_2) is True
    assert redis_client.validate_refresh_token(user_id, refresh_token_2) is False
    print(f"   ✅ Access Token blacklisted AND Redis Refresh Token destroyed!")

    # -------------------------------------------------------------
    # 10. 로그아웃 후 모든 토큰 접근 차단 검증
    # -------------------------------------------------------------
    print("\n[Step 10] Testing Post-Logout Total Revocation (Access & Refresh Both 401)...")
    res_access_blocked = client.get("/api/v1/companies/me", headers={"Authorization": f"Bearer {access_token_2}"})
    assert res_access_blocked.status_code == 401
    print(f"   🛡️ Logged-out Access Token blocked (401): {res_access_blocked.json()['detail']}")

    res_refresh_blocked = client.post("/api/v1/auth/refresh", json={"refreshToken": refresh_token_2})
    assert res_refresh_blocked.status_code == 401
    print(f"   🛡️ Logged-out Refresh Token blocked (401): {res_refresh_blocked.json()['detail']}")

    print("\n" + "=" * 65)
    print("🎉 ALL 10 DUAL-TOKEN & RTR E2E TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 65)

if __name__ == "__main__":
    run_tests()
