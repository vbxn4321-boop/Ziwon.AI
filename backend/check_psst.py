import httpx
import json

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
    res = httpx.post("http://localhost:8000/api/v1/psst/generate", json=payload, timeout=60.0)
    data = res.json()
    print("Plan Keys:", list(data.get("plan", {}).keys()))
    print("Sample JSON:", json.dumps(data.get("plan", {}), ensure_ascii=False)[:300])

if __name__ == "__main__":
    test_psst()
