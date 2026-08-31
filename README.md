# 🚀 Ziwon.AI (지윈에이아이)

<div align="center">

**대한민국 기업 맞춤형 정부지원사업 AI 탐색, 심층 분석 및 표준 PSST 사업계획서 자동화 플랫폼**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python)](https://python.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791?style=flat-square&logo=postgresql)](https://supabase.com)
[![Redis](https://img.shields.io/badge/Redis-5.2-DC382D?style=flat-square&logo=redis)](https://redis.io/)
[![Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini-4285F4?style=flat-square&logo=google)](https://ai.google.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

</div>

---

## 📌 목차 (Table of Contents)
1. [프로젝트 소개](#-프로젝트-소개)
2. [핵심 기능](#-핵심-기능-key-features)
3. [시스템 아키텍처](#-시스템-아키텍처)
4. [기술 스택](#-기술-스택-tech-stack)
5. [디렉토리 구조](#-디렉토리-구조)
6. [빠른 시작 (Local Development)](#-빠른-시작-local-development)
7. [환경 변수 설정 (.env)](#-환경-변수-설정-env)
8. [클라우드 배포 가이드 (Vercel & Railway)](#-클라우드-배포-가이드)
9. [최신 업데이트 내역 (0831)](#-최신-업데이트-내역-branch-0831)

---

## 💡 프로젝트 소개

**Ziwon.AI**는 중소벤처기업부, 창업진흥원, K-Startup, 기업마당(Bizinfo) 등 수많은 공공 포털에 흩어져 있는 대한민국 정부지원사업 공고를 실시간으로 자동 수집 및 정규화하고, 기업의 프로필(업력, 매출, 산업 분야, 인증 등)에 최적화된 사업을 AI로 매칭해 주는 원스톱 지원사업 설루션입니다.

더 나아가 공고문 및 첨부 서식(HWP, HWPX, PDF)을 바이너리 수준에서 파싱하여 **Dual-Domain AI 정밀 합격 전략 리포트**를 제공하며, 중기부 공인 표준 **PSST(Problem-Solution-Scale up-Team) 사업계획서 자동 생성 및 100점 만점 심사위원 평가·1:1 AI 대화형 코칭**을 지원합니다.

---

## ✨ 핵심 기능 (Key Features)

### 1. 📡 실시간 공고 수집 및 정규화 파이프라인 (Data Ingestion)
* **K-Startup & 기업마당(Bizinfo)** OpenAPI 비동기 동시 병렬 수집 (`asyncio.gather`)
* 고유 식별자(`externalId`) 기반 중복 제거 및 단일 표준 DB 스키마 정규화
* **APScheduler** 백그라운드 스케줄러를 통한 자동 주기적 동기화

### 2. 📑 고성능 문서 파싱 엔진 (HWP 5.0 / HWPX / PDF)
* **HWP 5.0 Compound File (OLE)** 바이너리 스트림 디플레이트(`zlib.decompress`) 자체 파싱
* **HWPX (Open XML Zip)** 및 **PDF (pypdf)** 텍스트 자동 추출
* 공고 첨부파일 다운로드 및 청크 분할(`DocumentChunk`) 인덱싱

### 3. 🎯 Dual-Domain AI 정밀 합격 전략 리포트
* **Fact 영역 (Strict)**: 공고문 원문에서 나이/지역/업력 제한, 지원규모, 제출서류, 결격사유 추출 (할루시네이션 원천 차단)
* **Strategy 영역 (Insight)**: 소관/주관기관(중기부, TP, 기보, 신보 등)의 정책 성향을 반영한 3-Step 합격 공략법 및 배점표 작성 팁 제공

### 4. 📝 중기부 표준 PSST 2-Pane 사업계획서 생성기 & 심사위원 평가
* **2-Pane 분할 작업 환경**: 좌측(입력 폼 / AI 창업 코치 채팅), 우측(실시간 PSST 문서 뷰어 / 100점 평가표)
* **PSST 4대 섹션 자동 생성**:
  * 1. 문제인식 (Problem)
  * 2. 실현가능성 (Solution)
  * 3. 성장전략 (Scale-up)
  * 4. 팀 구성 (Team)
* **100점 만점 심사위원 채점 리포트**: 항목별 점수, 통과 등급(S/A/B), 강점 및 감점 보완 가이드 제공
* **내보내기 및 관리**: HWP, PDF, JSON 다운로드, 클라우드 저장 및 불러오기

### 5. 💬 1:1 대화형 AI 창업 컨설턴트 (Chat Coach)
* 창업 아이디어 인터뷰를 통한 PSST 5단계(아이템, 문제인식, 기술, BM, 팀) 심층 답변 도출
* 사용자 맞춤형 퀵 답변 제안(`<<<SUGGESTIONS>>>`) 실시간 렌더링

### 6. 🛡️ Redis 기반 엔터프라이즈급 인증 & 보안 (Auth & Security)
* **6자리 이메일 OTP**: Redis 기반 3분 TTL 및 60초 쿨다운 보안 발송/검증
* **Bcrypt** 단방향 비밀번호 암호화 해싱
* **이중 JWT 토큰 및 RTR (Refresh Token Rotation)**: 30분 단기 Access Token + 30일 회전형 Refresh Token
* **로그아웃 블랙리스트**: Access Token 블랙리스트 등록 및 Redis 리프레시 토큰 즉시 파기

### 7. 🏢 기업 프로필 맞춤형 추천 & 스마트 필터 대시보드
* 기업 프로필(업력, 매출액, 표준산업분류, 소재지, 특허/인증) 기반 추천 캐러셀
* 실시간 카테고리/지역/주관기관 동적 필터 카운팅 및 마감임박(D-Day) 정렬
* SWR 메모리 캐시를 통한 페이지 이동 시 지연 없는 즉각 복원

---

## 🏛️ 시스템 아키텍처

```mermaid
flowchart TB
    subgraph Client ["Client Browser (Next.js 15 App Router)"]
        UI["Modern Responsive UI\n(TailwindCSS / Dark Mode)"]
        PSST_UI["PSST 2-Pane Editor\n& 1:1 Chat Coach"]
        Detail_UI["/programs/[id]\n공고 상세 & AI 전략 리포트"]
    end

    subgraph FrontendServer ["Next.js Server (Vercel)"]
        AppRoutes["App Router Pages & Layouts"]
        APIProxy["Next.js API Routes\n(/api/auth, /api/filters, /api/ai)"]
        PrismaClient["Prisma ORM Client"]
    end

    subgraph BackendServer ["FastAPI Core Engine (Railway)"]
        FastAPIApp["FastAPI REST API (/api/v1)"]
        AuthModule["Auth & Security Engine\n(OTP / Bcrypt / RTR JWT)"]
        CrawlerEngine["Crawler Pipeline\n(Bizinfo / K-Startup)"]
        ParserEngine["Doc Parser\n(HWP OLE / HWPX / PDF)"]
        GeminiService["Google GenAI Engine\n(PSST / Dual-Domain Analyzer)"]
        Scheduler["APScheduler Background Task"]
    end

    subgraph DataStorage ["Data & Cache Infrastructure"]
        PostgreSQL[("PostgreSQL\n(Supabase / Prisma)")]
        RedisDB[("Redis Cache & OTP\n(Upstash / Railway)")]
    end

    subgraph ExternalServices ["External Public APIs & AI"]
        BizOpenAPI["기업마당 OpenAPI"]
        KstOpenAPI["K-Startup OpenAPI"]
        GoogleAI["Google Gemini API\n(gemini-2.0-flash / gemini-1.5)"]
    end

    UI <--> AppRoutes
    PSST_UI <--> APIProxy
    Detail_UI <--> APIProxy
    APIProxy <--> PrismaClient
    APIProxy <--> FastAPIApp

    FastAPIApp <--> AuthModule
    FastAPIApp <--> CrawlerEngine
    FastAPIApp <--> ParserEngine
    FastAPIApp <--> GeminiService

    AuthModule <--> RedisDB
    AuthModule <--> PostgreSQL
    PrismaClient <--> PostgreSQL
    FastAPIApp <--> PostgreSQL

    CrawlerEngine <--> BizOpenAPI
    CrawlerEngine <--> KstOpenAPI
    GeminiService <--> GoogleAI
    APIProxy <--> GoogleAI
```

---

## 💻 기술 스택 (Tech Stack)

| 구분 | 기술 / 라이브러리 | 용도 |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 15 (App Router)**, React 19, TypeScript | 고성능 SSR/CSR 하이브리드 웹 애플리케이션 |
| **Styling & Icons** | **TailwindCSS**, Lucide React | 반응형 레이아웃, 다크 모드, 모던 글래스모피즘 |
| **Backend Framework** | **Python FastAPI**, Uvicorn | 비동기 고성능 RESTful API 서버 |
| **Database** | **PostgreSQL (Supabase)**, Prisma ORM, SQLAlchemy | 정규화된 10개 엔티티 데이터베이스 및 풀링 |
| **Cache & OTP** | **Redis** (`redis-py`) | OTP 유효시간(3분), 리프레시 토큰 RTR, 블랙리스트 |
| **AI Models** | **Google Gemini** (`@google/genai`, `google-genai`) | 공고 심층 분석, PSST 사업계획서 생성, 컨설턴트 챗 |
| **문서 파싱** | `olefile`, `zlib`, `pypdf`, `xml.etree` | HWP 5.0 OLE 바이너리, HWPX XML, PDF 텍스트 추출 |
| **배포 인프라** | **Vercel** (Frontend), **Railway** (Backend) | 자동 CI/CD 및 글로벌 엣지 배포 |

---

## 📁 디렉토리 구조

```
Ziwon.AI/
├── frontend/                          # ⚛️ Next.js 15 Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx               # 메인 대시보드 (검색, 필터, 추천 캐러셀, 목록)
│   │   │   ├── programs/[id]/page.tsx # 공고 상세 전용 페이지 (AI 합격 전략 리포트)
│   │   │   ├── mypage/page.tsx        # 마이페이지 (기업 프로필, 북마크, 저장된 계획서)
│   │   │   ├── login/ & signup/       # OTP 및 패스워드 인증 페이지
│   │   │   ├── api/                   # Next.js API Routes (auth, filters, ai, download 등)
│   │   │   └── globals.css            # 전역 디자인 토큰 및 애니메이션
│   │   ├── components/
│   │   │   ├── Header.tsx & Footer.tsx
│   │   │   ├── ProgramCard.tsx        # 지원사업 카드 컴포넌트
│   │   │   ├── ProgramDetailModal.tsx # 공고 빠른 미리보기 모달
│   │   │   ├── PsstPlanGenerator.tsx  # PSST 사업계획서 메인 컨테이너
│   │   │   ├── psst/                  # PSST 서브 컴포넌트 (Editor, Viewer, Chat, Evaluation)
│   │   │   └── auth/                  # AuthModal, CompanyProfileModal, SavedPlansModal
│   │   └── lib/
│   │       ├── ai/gemini-analyzer.ts  # Dual-Domain AI 공고 분석기
│   │       ├── ai/psst-generator.ts   # PSST 계획서 생성 모듈
│   │       ├── backend-client.ts      # 통합 API 통신 클라이언트
│   │       ├── supabase-client.ts     # Supabase 세션 유틸리티
│   │       └── db.ts                  # Prisma Client 인스턴스
│   ├── prisma/
│   │   └── schema.prisma              # PostgreSQL 스키마 정의
│   ├── package.json
│   └── vercel.json
│
└── backend/                           # 🐍 Python FastAPI Core Engine
    ├── app/
    │   ├── api/v1/
    │   │   ├── auth.py                # OTP, Login, Signup, RTR Refresh, Logout
    │   │   ├── crawler.py             # 크롤러 실행 엔드포인트
    │   │   ├── parser.py              # HWP/PDF 문서 파서 엔드포인트
    │   │   ├── psst.py                # PSST 생성 및 챗봇 엔드포인트
    │   │   ├── companies.py           # 기업 프로필 CRUD
    │   │   ├── plans.py               # 저장된 PSST 사업계획서 CRUD
    │   │   ├── bookmarks.py           # 관심 공고 북마크 CRUD
    │   │   └── health.py              # 서버 헬스체크
    │   ├── core/
    │   │   ├── config.py              # 환경변수 Pydantic Settings
    │   │   ├── database.py            # SQLAlchemy Engine & Session
    │   │   ├── redis_client.py        # Redis OTP & RTR 매니저
    │   │   └── security.py            # JWT 및 암호화 유틸
    │   ├── schemas/                   # Pydantic Request/Response DTO
    │   └── services/
    │       ├── crawler_service.py     # Bizinfo / K-Startup 크롤러 파이프라인
    │       ├── gemini_service.py      # Google GenAI 연동 서비스
    │       ├── parser_service.py      # HWP(OLE)/HWPX/PDF 파서
    │       └── scheduler_service.py   # APScheduler 백그라운드 스케줄러
    ├── main.py                        # FastAPI 메인 진입점
    ├── requirements.txt
    ├── Procfile                       # Railway 배포 설정
    └── railway.json
```

---

## ⚡ 빠른 시작 (Local Development)

### 1. 사전 요구사항 (Prerequisites)
* Node.js 18.18+ / npm
* Python 3.11+
* PostgreSQL (또는 Supabase 계정)
* Redis (로컬 Redis 또는 Upstash/Railway Redis)

---

### 2. 저장소 복제 및 환경 변수 설정
```bash
git clone https://github.com/your-repo/Ziwon.AI.git
cd Ziwon.AI
```

#### 프론트엔드 환경변수 설정
```bash
cd frontend
cp .env.example .env
# .env 파일에 Supabase DATABASE_URL, GEMINI_API_KEY, JWT_SECRET 등을 입력합니다.
```

#### 백엔드 환경변수 설정
```bash
cd ../backend
cp .env.example .env
# .env 파일에 DATABASE_URL, REDIS_URL, GEMINI_API_KEY, JWT_SECRET 등을 입력합니다.
```

---

### 3. 프론트엔드 실행 (Next.js)
```bash
cd frontend
npm install
npx prisma generate
npm run dev
```
* 🌐 프론트엔드 접속: **http://localhost:3000**

---

### 4. 백엔드 실행 (Python FastAPI)
```bash
cd backend
python -m venv venv

# 가상환경 활성화
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
# source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
* 📑 백엔드 Swagger API 문서: **http://localhost:8000/docs**
* 🩺 헬스체크 엔드포인트: **http://localhost:8000/api/v1/health**

---

## ⚙️ 환경 변수 설정 (.env)

### Frontend (`frontend/.env`)
```env
# 1. Database (Supabase PostgreSQL via Prisma)
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres"

# 2. Backend API URL
BACKEND_API_URL="https://ziwonai-production.up.railway.app/api/v1"

# 3. Google Gemini AI Models
GEMINI_API_KEY="AIzaSy..."
AI_GENERAL_MODEL="gemini-2.0-flash"

# 4. Official Public OpenAPI Keys
KSTARTUP_API_KEY="your-kstartup-api-key"
BIZINFO_API_KEY="your-bizinfo-api-key"

# 5. JWT Security (백엔드와 일치 필수)
JWT_SECRET="your-256-bit-secure-hex-jwt-secret"
JWT_ALGORITHM="HS256"
```

### Backend (`backend/.env`)
```env
# 1. Supabase PostgreSQL
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?sslmode=require"

# 2. Google Gemini API
GEMINI_API_KEY="AIzaSy..."

# 3. Redis URL
REDIS_URL="redis://localhost:6379/0"

# 4. JWT Security
JWT_SECRET="your-256-bit-secure-hex-jwt-secret"
JWT_ALGORITHM="HS256"

# 5. Ingestion Keys
BIZINFO_API_KEY="your-bizinfo-api-key"
KSTARTUP_API_KEY="your-kstartup-api-key"
```

---

## 🌐 클라우드 배포 가이드

### 1. Vercel (Frontend 배포)
1. [Vercel Dashboard](https://vercel.com)에서 **`Import Project`** 선택
2. **Root Directory**: `frontend` 로 지정
3. **Environment Variables**: 위의 `frontend/.env` 항목들을 Vercel 환경 변수로 등록
4. **Deploy** 클릭

### 2. Railway (Backend & Redis 배포)
1. [Railway Dashboard](https://railway.com)에서 **`New Project` -> `Deploy from GitHub repo`** 선택
2. **Settings -> Root Directory**: `backend` 로 지정
3. **Add Database -> Redis** 생성 후 `REDIS_URL` 환경 변수 연결
4. **Variables**: `DATABASE_URL`, `GEMINI_API_KEY`, `JWT_SECRET` 등록
5. `Procfile`과 `railway.json`에 의해 자동 배포 진행

---

## 🆕 최신 업데이트 내역 (Branch `0831`)

* **공고문 상세 전용 독립 라우트 분리 (`/programs/[id]`)**:
  * 기존 팝업 모달 방식에서 독립 URL 페이지로 전면 개편하여 공유(Share) 및 SEO 최적화
  * D-Day 계산기, 접수처 바로가기, 첨부파일 원클릭 다운로더 탑재
* **Dual-Domain AI 정밀 합격 전략 리포트 고도화**:
  * Fact 영역(공고 원문 strict 사실)과 Strategy 영역(소관 부처 맞춤 전략)을 엄격히 분리
  * 중기부, 테크노파크(TP), 기술보증기금(KIBO) 등 주관기관별 심사위원 채점 포인트 분석 로직 반영
* **메인 대시보드 UI/UX 개편**:
  * 맞춤 추천 사업 자동 슬라이드(Auto-play) 캐러셀 컨트롤러 개선
  * 동적 카테고리/지역/소관기관 필터 및 실시간 진행중(D-Day) 토글 필터 최적화
* **한글 공고문 뷰어 렌더링 최적화**:
  * HWP 텍스트 줄바꿈 및 HTML 엔터티 안전 디코딩 처리

---

<div align="center">
  <sub>Built with ❤️ by Ziwon.AI Team. Empowering South Korean Startups with Artificial Intelligence.</sub>
</div>