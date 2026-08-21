# 🚀 Ziwon.AI (지윈에이아이)

대한민국 기업 맞춤형 정부지원사업 AI 탐색, 심층 분석 및 표준 PSST 사업계획서 자동화 플랫폼

---

## 🏛️ 프로젝트 아키텍처 (Monorepo)

```
Ziwon.AI/
├── frontend/             # ⚛️ Next.js 15 (App Router, React 19, TailwindCSS, Prisma) -> Vercel 배포
│   ├── src/
│   │   ├── app/          # 페이지 및 Next.js API 라우트
│   │   ├── components/   # UI 컴포넌트 & PSST 사업계획서 모듈
│   │   └── lib/          # DB 세션 및 유틸리티
│   ├── prisma/           # PostgreSQL DB 스키마 (Supabase)
│   ├── package.json
│   └── vercel.json
│
└── backend/              # 🐍 Python FastAPI Core Engine -> Railway 배포
    ├── app/
    │   ├── api/v1/       # 크롤러, HWP/PDF 파서, PSST AI 엔드포인트
    │   ├── core/         # 환경변수 및 DB 연결 설정
    │   └── services/     # 크롤링, 문서 파싱, Gemini AI, APScheduler
    ├── main.py           # FastAPI 진입점 & CORS
    ├── requirements.txt
    ├── Procfile
    └── railway.json
```

---

## ⚡ 빠른 시작 (Quick Start)

### 1. 프론트엔드 실행 (Next.js)
```bash
# 루트 디렉토리에서 바로 실행
npm run dev

# 또는 frontend 디렉토리로 이동하여 실행
cd frontend
npm run dev
```
* 브라우저 접속: **http://localhost:3000**

---

### 2. 백엔드 실행 (Python FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate
pip install -r requirements.txt

# 서버 실행
uvicorn main:app --reload --port 8000
```
* Swagger API 문서: **http://localhost:8000/docs**

---

## 🌐 클라우드 배포 가이드

1. **Vercel (Frontend 배포)**:
   * Vercel 대시보드 -> Settings -> General -> **`Root Directory`를 `frontend`로 지정**
2. **Railway (Backend 배포)**:
   * Railway 대시보드 -> Settings -> **`Root Directory`를 `backend`로 지정**