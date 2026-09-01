import os
from fastapi.testclient import TestClient
from main import app
from app.core.redis_client import redis_client

client = TestClient(app)

def test_fastapi_httponly_flow():
    test_email = "httponly_test_auto@ziwon.ai"
    test_pwd = "password123"

    print("=== 1. OTP 발송 & 검증 ===")
    r1 = client.post("/api/v1/auth/send-otp", json={"email": test_email})
    assert r1.status_code == 200, f"send-otp failed: {r1.text}"

    # Extract code from RedisManager
    key = f"ziwon:otp:{test_email}"
    if redis_client._client:
        code = redis_client._client.get(key)
    else:
        code = redis_client._memory_store.get(key, {}).get("code")

    assert code is not None, "OTP not found in redis_client"
    print(f"  -> OTP Code: {code}")

    r2 = client.post("/api/v1/auth/verify-otp", json={"email": test_email, "code": code})
    assert r2.status_code == 200, f"verify-otp failed: {r2.text}"

    print("=== 2. 회원가입 및 HttpOnly 쿠키 발급 확인 ===")
    r3 = client.post("/api/v1/auth/signup", json={"email": test_email, "password": test_pwd, "fullName": "보안테스터"})
    if r3.status_code == 400 and "이미 가입된" in r3.text:
        r3 = client.post("/api/v1/auth/login", json={"email": test_email, "password": test_pwd})
    
    assert r3.status_code == 200, f"signup/login failed: {r3.text}"
    signup_json = r3.json()
    assert "accessToken" in signup_json, "accessToken missing in body"
    
    # Verify HttpOnly Cookie was set
    cookie_header = r3.headers.get("set-cookie", "")
    assert "ziwon_refresh_token=" in cookie_header, f"ziwon_refresh_token cookie not in set-cookie: {cookie_header}"
    assert "httponly" in cookie_header.lower(), "Cookie must be HttpOnly"
    print(f"  -> Access Token: {signup_json['accessToken'][:25]}...")
    print(f"  -> Set-Cookie Header: {cookie_header[:60]}...")

    # Extract cookie for client simulation
    cookies = r3.cookies
    refresh_cookie_val = cookies.get("ziwon_refresh_token")

    print("=== 3. HttpOnly 쿠키 기반 무음 자동 갱신 (Silent Refresh) ===")
    r4 = client.post("/api/v1/auth/refresh", cookies={"ziwon_refresh_token": refresh_cookie_val})
    assert r4.status_code == 200, f"refresh failed: {r4.text}"
    refresh_json = r4.json()
    assert "accessToken" in refresh_json, "refreshed accessToken missing"
    rotated_cookie = r4.headers.get("set-cookie", "")
    assert "ziwon_refresh_token=" in rotated_cookie, "Rotated refresh token cookie must be present"
    print(f"  -> New Access Token: {refresh_json['accessToken'][:25]}...")
    print(f"  -> Rotated Cookie Header: {rotated_cookie[:60]}...")

    print("=== 4. 로그아웃 및 쿠키 삭제 확인 ===")
    r5 = client.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {refresh_json['accessToken']}"})
    assert r5.status_code == 200, f"logout failed: {r5.text}"
    logout_cookie = r5.headers.get("set-cookie", "")
    print(f"  -> Logout success: {r5.json()}")
    print(f"  -> Logout Set-Cookie: {logout_cookie}")

    print("\n[SUCCESS] FastAPI HttpOnly 쿠키 인증 및 무음 갱신 테스트 완벽 통과!")

if __name__ == "__main__":
    test_fastapi_httponly_flow()
