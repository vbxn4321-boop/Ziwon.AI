import httpx
import json

def test_health():
    res = httpx.get("http://localhost:8000/api/v1/health")
    print("\n==========================================")
    print("1. [FastAPI Health Check]")
    print("   Status:", res.status_code, res.json())

def test_parser():
    payload = {
        "fileUrl": "https://www.bizinfo.go.kr/cmm/fms/fileDown.do?atchFileId=FILE_000000000769970&fileSn=1",
        "fileType": "PDF"
    }
    print("\n==========================================")
    print("2. [Document Binary Parser Test (HWP/PDF)]")
    res = httpx.post("http://localhost:8000/api/v1/parser/url", json=payload, timeout=30.0)
    data = res.json()
    print("   Status Code:", res.status_code)
    print("   Extraction Success:", data.get("success"))
    print("   Extracted Character Count:", data.get("characterCount"))

def test_psst():
    payload = {
        "companyName": "(주)지윈에이아이",
        "itemName": "AI 기반 맞춤형 정부지원사업 탐색 및 PSST 사업계획서 자동 생성 SaaS",
        "industry": "생성형 AI / B2B SaaS",
        "itemDescription": "전국 1,500개 이상의 공공기관 지원사업을 매일 자동 수집하고, 기업 정보에 최적화된 사업계획서와 100점 만점 심사위원 평가 리포트를 실시간 생성하는 솔루션입니다.",
        "targetProgramTitle": "2026년 중소벤처기업부 초기창업패키지",
        "budget": "7,000만원",
        "coreStrengths": "한국 공공문서 HWP 고속 파싱 엔진 탑재, Gemini 3.6 기반 심사위원 합격 논리 구조화"
    }
    print("\n==========================================")
    print("3. [Gemini 3.6 PSST Business Plan Full Generation]")
    res = httpx.post("http://localhost:8000/api/v1/psst/generate", json=payload, timeout=60.0)
    data = res.json()
    print("   Status Code:", res.status_code)
    print("   Success:", data.get("success"))
    plan = data.get("plan", {})
    if plan:
        overview = plan.get("overview", {})
        eval_rep = plan.get("evaluationReport", {})
        print("   [Project Title]:", overview.get("title"))
        print("   [Industry]:", overview.get("industry"))
        print("   [Judge Score]:", f"{eval_rep.get('score')} / 100 ({eval_rep.get('grade')})")
        print("   [Competitor Table]:", "Created" if plan.get("solution", {}).get("competitorTable") else "None")
        print("   [Budget Table]:", "Created" if plan.get("scaleUp", {}).get("budgetTable") else "None")
    print("==========================================\n")

if __name__ == "__main__":
    test_health()
    test_parser()
    test_psst()
