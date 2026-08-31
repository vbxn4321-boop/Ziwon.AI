# 🐍 Ziwon.AI Python FastAPI Core Engine

대한민국 정부지원사업(기업마당, K-Startup) 실시간 크롤링, HWP 5.0 OLE/HWPX/PDF 공고문 고속 파싱, Redis 기반 보안 인증(OTP/RTR), Google Gemini 기반 표준 PSST 사업계획서 생성 및 1:1 대화형 창업 코칭 엔진입니다.

---

## 🚀 로컬 개발 환경 실행 방법

### 1. 가상환경 생성 및 패키지 설치
```bash
cd backend
python -m venv venv

# 가상환경 활성화
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
# source venv/bin/activate

pip install -r requirements.txt
```

### 2. 환경변수 설정
`.env.example` 파일을 복사하여 `.env`를 생성하고 필요한 키를 입력합니다:
```bash
cp .env.example .env
```

* **DATABASE_URL**: Supabase PostgreSQL 연결 주소 (`sslmode=require`)
* **REDIS_URL**: Redis 연결 URI (`redis://localhost:6379/0` 또는 Upstash/Railway Redis)
* **GEMINI_API_KEY**: Google AI Studio Gemini API Key
* **JWT_SECRET**: 256비트 보안 시크릿 키 (생성: `python -c "import secrets; print(secrets.token_hex(32))"`)
* **BIZINFO_API_KEY / KSTARTUP_API_KEY**: 기업마당 / K-Startup OpenAPI 인증키

### 3. 서버 실행
```bash
uvicorn main:app --reload --port 8000
```
* **Swagger API 대화형 문서**: http://localhost:8000/docs
* **ReDoc 문서**: http://localhost:8000/redoc
* **서버 상태 헬스체크**: http://localhost:8000/api/v1/health

---

## 🔑 주요 API 엔드포인트 구조

* **인증 및 보안 (`/api/v1/auth`)**:
  * `POST /send-otp`: 6자리 이메일 인증번호 발송 (Redis 3분 TTL, 60초 쿨다운)
  * `POST /verify-otp`: 6자리 인증번호 검증
  * `POST /signup`: 이메일 회원가입 및 이중 토큰 발급
  * `POST /login`: Bcrypt 비밀번호 검증 및 토큰 발급
  * `POST /refresh`: **RTR (Refresh Token Rotation)** 기반 토큰 자동 갱신
  * `POST /logout`: 토큰 블랙리스트 등록 및 Redis 리프레시 세션 파기
* **수집 및 파싱 (`/api/v1/crawler`, `/api/v1/parser`)**:
  * `POST /crawler/run`: 기업마당 & K-Startup 실시간 수집 및 DB 적재 파이프라인
  * `POST /parser/extract-text`: HWP(OLE 디플레이트)/HWPX/PDF 첨부파일 텍스트 추출
* **PSST AI 생성 및 코칭 (`/api/v1/psst`)**:
  * `POST /psst/generate`: 4대 섹션 PSST 사업계획서 및 100점 만점 심사위원 리포트 생성
  * `POST /psst/coach`: PSST 작성 대화형 챗봇 인터뷰 및 맞춤 추천 키워드 제공
* **데이터 관리 CRUD (`/api/v1/companies`, `/api/v1/plans`, `/api/v1/bookmarks`)**:
  * 기업 프로필, 저장된 PSST 사업계획서, 관심 지원사업 스크랩 관리

---

## 🚂 Railway 클라우드 배포 가이드

1. **Railway 접속 & 로그인** (https://railway.com)
2. **`New Project` -> `Deploy from GitHub repo`** -> `Ziwon.AI` 레포지토리 선택
3. **Database 추가**: `New` -> `Database` -> `Add Redis` 생성
4. **배포 설정**:
   * **Settings -> Root Directory**: `backend` 로 지정
   * **Variables (환경변수)**:
     * `DATABASE_URL`: Supabase DB 연결 문자열
     * `REDIS_URL`: 생성된 Railway Redis 연결 문자열 (`${{Redis.REDIS_URL}}`)
     * `GEMINI_API_KEY`: Google Gemini API Key
     * `JWT_SECRET`: 256비트 보안 키
     * `ENVIRONMENT`: `production`
     * `PORT`: `8000`

> 💡 저장소에 `Procfile`과 `railway.json`이 구성되어 있어, GitHub에 Push 시 Railway가 자동으로 빌드하고 배포합니다.
