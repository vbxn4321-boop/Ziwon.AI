# 🐍 Ziwon.AI Python FastAPI Core Engine

대한민국 정부지원사업 실시간 크롤링, HWP/HWPX/PDF 공고문 고속 파싱, Gemini 2.5 기반 표준 PSST 사업계획서 심층 생성 엔진입니다.

---

## 🚀 로컬 개발 환경 실행 방법

### 1. 가상환경 생성 및 패키지 설치
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
```

### 2. 환경변수 설정
`.env.example` 파일을 복사하여 `.env`를 생성하고 실제 키를 입력합니다:
```bash
cp .env.example .env
```

* **DATABASE_URL**: Supabase 대시보드 -> Project Settings -> Database -> Connection String (URI)
* **GEMINI_API_KEY**: Google AI Studio API Key

### 3. 서버 실행
```bash
uvicorn main:app --reload --port 8000
```
* **Swagger API 문서**: http://localhost:8000/docs
* **서버 상태 확인**: http://localhost:8000/api/v1/health

---

## 🚂 Railway 배포 방법 (초간단 3단계)

1. **Railway 접속 & 로그인** (https://railway.com)
2. **`New Project` -> `Deploy from GitHub repo`** -> Ziwon.AI 레포지토리 선택
3. **배포 설정**:
   * **Settings -> Root Directory**: `backend` 로 지정
   * **Variables (환경변수)**:
     * `DATABASE_URL`: Supabase DB 연결 주소
     * `GEMINI_API_KEY`: Gemini API 키
     * `ENVIRONMENT`: `production`

> 💡 `Procfile`과 `railway.json`이 이미 포함되어 있어, GitHub에 Push하면 Railway가 자동으로 빌드하고 배포합니다.
