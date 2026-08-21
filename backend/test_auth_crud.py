import jwt
import uuid
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from main import app

# Create in-process ASGI TestClient
client = TestClient(app)

TEST_USER_ID = str(uuid.uuid4())
TEST_EMAIL = f"test_{uuid.uuid4().hex[:6]}@ziwon.ai"
payload = {
    "sub": TEST_USER_ID,
    "email": TEST_EMAIL,
    "role": "authenticated",
    "exp": datetime.utcnow() + timedelta(days=7),
    "user_metadata": {"full_name": "홍길동 대표"}
}
MOCK_JWT = jwt.encode(payload, "this_is_a_secure_mock_supabase_secret_key_32bytes", algorithm="HS256")
HEADERS = {
    "Authorization": f"Bearer {MOCK_JWT}",
    "Content-Type": "application/json"
}

def run_tests():
    print("\n==========================================")
    print("[TEST] FastAPI Member Auth & CRUD Suite Test")
    print("   Test User ID:", TEST_USER_ID)
    print("   Test User Email:", TEST_EMAIL)
    print("==========================================")

    # 1. User Profile / Auto-provisioning
    res = client.get("/api/v1/users/me", headers=HEADERS)
    print("\n1. [User Profile Check]:", res.status_code, res.json())
    assert res.status_code == 200

    # 2. Company Profile CRUD
    comp_data = {
        "name": "(주)지윈에이아이",
        "bizRegNo": "123-45-67890",
        "industry": "생성형 AI B2B SaaS",
        "region": "서울특별시 강남구",
        "foundedDate": "2024-01-15T00:00:00",
        "revenue": 150000000.0,
        "employeeCount": 5,
        "hasPatents": True,
        "coreItemSummary": "정부지원사업 AI 자동 탐색 및 PSST 사업계획서 자동화 솔루션"
    }
    res = client.post("/api/v1/companies/me", headers=HEADERS, json=comp_data)
    print("\n2. [Company Profile Create/Update]:", res.status_code, "Company Name:", res.json().get("name"))
    assert res.status_code == 200

    res = client.get("/api/v1/companies/me", headers=HEADERS)
    print("   [Company Profile Read]:", res.status_code, "Industry:", res.json().get("industry"))
    assert res.status_code == 200

    # 3. PSST Plan CRUD
    plan_data = {
        "title": "2026년 초창패 도전용 AI 지원사업 SaaS 계획서",
        "targetProgramTitle": "2026년 초기창업패키지",
        "planJson": {
            "overview": {"title": "Ziwon.AI Platform", "industry": "AI SaaS"},
            "evaluationReport": {"score": 96, "grade": "S"}
        },
        "score": 96,
        "grade": "S"
    }
    res = client.post("/api/v1/plans", headers=HEADERS, json=plan_data)
    print("\n3. [PSST Plan Create]:", res.status_code, "Plan ID:", res.json().get("id"))
    assert res.status_code == 200
    created_plan_id = res.json()["id"]

    res = client.get("/api/v1/plans", headers=HEADERS)
    print("   [PSST Plan List]:", res.status_code, "Count:", len(res.json()))
    assert res.status_code == 200

    res = client.get(f"/api/v1/plans/{created_plan_id}", headers=HEADERS)
    print("   [PSST Plan Detail Read]:", res.status_code, "Score:", res.json().get("score"))
    assert res.status_code == 200

    update_data = {"title": "수정된 제목: 2026년 초창패 최종 제출본", "score": 98}
    res = client.put(f"/api/v1/plans/{created_plan_id}", headers=HEADERS, json=update_data)
    print("   [PSST Plan Update]:", res.status_code, "Updated Title:", res.json().get("title"))
    assert res.status_code == 200

    # 4. Bookmark Toggle CRUD (Use an existing program or mock)
    dummy_prog_id = "dabf62ff-4736-4b2b-8c5f-a6496b273bad"
    res = client.post(f"/api/v1/bookmarks/{dummy_prog_id}/toggle", headers=HEADERS)
    print("\n4. [Bookmark Toggle (Add)]:", res.status_code, res.json())
    assert res.status_code == 200

    res = client.get("/api/v1/bookmarks", headers=HEADERS)
    print("   [Bookmark List Read]:", res.status_code, "Bookmarked Count:", len(res.json()))
    assert res.status_code == 200

    res = client.post(f"/api/v1/bookmarks/{dummy_prog_id}/toggle", headers=HEADERS)
    print("   [Bookmark Toggle (Remove)]:", res.status_code, res.json())
    assert res.status_code == 200

    # 5. Delete Plan Cleanup
    res = client.delete(f"/api/v1/plans/{created_plan_id}", headers=HEADERS)
    print("\n5. [PSST Plan Delete Cleanup]:", res.status_code, res.json())
    assert res.status_code == 200

    print("\n==========================================")
    print("[SUCCESS] ALL MEMBER AUTH & CRUD TESTS PASSED 100%!")
    print("==========================================\n")

if __name__ == "__main__":
    run_tests()
