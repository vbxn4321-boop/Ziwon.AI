# 🚀 Ziwon.AI (지윈에이아이)

> **대한민국 정부 및 공공기관 지원사업 통합 탐색 & AI 정밀 분석 플랫폼**  
> 기업마당(Bizinfo)과 K-Startup의 공공 데이터를 실시간 수집하고, 첨부문서(PDF/HWP/HWPX/DOCX) 파싱 및 **Google Gemini AI**를 통해 핵심 지원조건, 심사/검토 기준, 우선선정 및 가점 요건을 한눈에 분석해 드립니다.

---

## 🌟 주요 기능 (Key Features)

1. **실시간 공공 공고 자동 수집 & 동기화 (Automated Ingestion)**
   - **기업마당(Bizinfo)** OpenAPI 및 **K-Startup(창업진흥원)** OpenAPI 연동 (1,500+건 이상 실시간 동기화)
   - Vercel Cron (`0 0 * * *`) 기반 자동 일일 동기화 및 500건 단위 고속 벌크 인서트 (`createMany`)
   - 중복 공고 식별 및 신규 등록(`NEW`), 긴급 마감 임박(`D-Day`), 마감 완료 상태 자동 계산

2. **다기종 공고 첨부문서 파싱 & RAG 청킹 (Multi-Format Document Parsing & RAG)**
   - 국내 공공기관 특화 포맷 완벽 지원: **HWPX, HWP, PDF, DOCX, HTML 웹페이지**
   - 웹페이지 내 첨부파일 다운로드 링크 동적 스크래퍼 (`attachment-scraper.ts`)
   - 원클릭 한글 파일 다운로드 프록시 지원 (`/api/download`)
   - 목차/헤더 기반 슬라이딩 윈도우 텍스트 청킹 (`chunker.ts`)

3. **Google Gemini AI 심층 분석 엔진 (AI Analysis Engine)**
   - Gemini 2.5 / 3.6 Flash 모델을 활용한 공고 원문 요약 및 구조화 분석
   - **분석 및 추출 항목**:
     - 🎯 **신청 자격 요건**: 업력, 대상 지역, 지원 업종, 필수 인증 요건
     - 💰 **지원 규모 및 예산**: 총 지원금액, 국비/지방비 자부담 비율
     - ⚖️ **심사 및 검토·평가 기준**: 단계별 심사 절차(1차 서류 ➔ 2차 발표 ➔ 현장실사 등), 세부 평가 항목 및 배점표, 과락 기준
     - ⭐ **가점 및 우선선정·우대 요건**: 1순위/2순위 우선선발 기준, 평가 면제, 동점자 처리 기준, 우대 대상 조건
     - ⚠️ **지원 제외 및 결격 사유**: 제외 업종, 세금 체납, 중복 수혜, 친인척 채용 등 10여 가지 결격 요건
     - 📑 **필수 제출 서류**: 신청서식, 사업계획서, 증빙서류 일체
     - 📝 **핵심 요약 리포트**: 3문장 Executive Summary

4. **듀얼 탐색 포털 & 다차원 스마트 필터 (Dual Portal Navigation)**
   - **기업마당 포털 모드**: 지원분야별, 소관부처별, 지역별 실시간 건수 집계 필터
   - **K-Startup 네비게이터 모드**: 기업 성장 단계(예비/초기/도약), 대표자 연령대별 특화 필터
   - 진행 중 공고 / 마감된 공고 실시간 토글 및 키워드 통합 검색

---

## 🏗 시스템 아키텍처 (Architecture)

```mermaid
flowchart TD
    subgraph DataCollection [데이터 수집 & 동기화]
        A1[Bizinfo RSS / OpenAPI] --> C[Collector / Ingestion Pipeline]
        A2[K-Startup 공공 API] --> C
        Cron[Vercel Cron Trigger] -->|Scheduled Daily| C
    end

    subgraph Storage [데이터베이스 - Supabase PostgreSQL]
        C -->|Bulk Insert| DB[(Prisma ORM: SupportProgram & SupportSource)]
    end

    subgraph DocumentETL [문서 파싱 & AI 파이프라인]
        DB -->|Pending Document| D[Dynamic Attachment Scraper]
        D --> E[Multi-Format Parser\nPDF / HWP / HWPX / DOCX]
        E --> F[RAG Document Chunker]
        F --> G[Google Gemini Flash AI]
        G -->|Structured JSON| H[(SupportAnalysis DB)]
    end

    subgraph UserInterface [프론트엔드 - Next.js 15]
        DB -->|Search & Filter API| UI[기업마당 & K-Startup 포털]
        H -->|AI Structured Report| Modal[공고 상세 & AI 분석 모달]
        E -->|Proxy Stream| DL[/api/download - 1-Click File Download/]
        UI --> Modal
    end
```

---

## 🛠 기술 스택 (Tech Stack)

| 구분 | 기술 스택 |
| :--- | :--- |
| **Frontend** | **Next.js 15 (App Router)**, **React 19**, **TailwindCSS**, **Lucide React** |
| **Backend / Serverless** | **Next.js Route Handlers**, **Vercel Serverless Functions** (MaxDuration 60s) |
| **Database & ORM** | **PostgreSQL (Supabase)**, **Prisma ORM 6.3.0** |
| **AI / LLM** | **Google Gemini 2.5 / 3.6 Flash** (`@google/genai` SDK) |
| **Document ETL** | `pdf-parse`, `mammoth` (DOCX), `adm-zip` (HWPX), `fast-xml-parser` |
| **Language & Tooling** | **TypeScript 5.7**, `tsx` |

---

## 📁 디렉토리 구조 (Directory Structure)

```text
Ziwon.AI/
├── prisma/
│   └── schema.prisma                 # PostgreSQL 데이터베이스 스키마 정의
├── scripts/
│   ├── fetch-real-api.ts             # OpenAPI 실시간 호출 테스트 스크립트
│   ├── reset-and-fetch-live.ts       # DB 리셋 및 전체 공고(1,500+건) 일괄 적재 스크립트
│   ├── seed.ts                       # 로컬 개발용 시드 데이터
│   └── verify-milestone1.ts          # 데이터 수집 및 정합성 검증 스크립트
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── cron/ingest/          # Vercel Cron 자동 수집 엔드포인트
│   │   │   ├── download/             # 원클릭 첨부파일 다운로드 프록시 API
│   │   │   ├── filters/              # 카테고리/지역/기관별 실시간 건수 집계 API
│   │   │   ├── pipeline/             # 배치 문서 파싱 & AI 분석 파이프라인 API
│   │   │   └── support-programs/     # 공고 목록 검색/필터링 & 상세 조회 & 온디맨드 AI 분석 API
│   │   ├── globals.css               # 테마 변수 및 글래스모피즘(Glassmorphism) 스타일
│   │   ├── layout.tsx                # 루트 레이아웃 & 메타데이터
│   │   └── page.tsx                  # 메인 페이지 (기업마당/K-Startup 듀얼 모드)
│   ├── components/
│   │   ├── Header.tsx                # 상단 헤더 & 포털 모드 전환 탭
│   │   ├── ProgramCard.tsx           # 공고 카드 컴포넌트 (NEW/D-Day 뱃지)
│   │   └── ProgramDetailModal.tsx    # 공고 상세 모달 (원문 링크, 1-Click 다운로드, AI 분석 리포트)
│   └── lib/
│       ├── ai/
│       │   └── gemini-analyzer.ts    # Google Gemini AI 구조화 프롬프트 및 분석 엔진
│       ├── crawler/
│       │   ├── bizinfo.ts            # 기업마당 OpenAPI 수집 모듈
│       │   ├── kstartup.ts           # K-Startup OpenAPI 수집 모듈
│       │   └── collector.ts          # 통합 인제스천 및 중복 제거 벌크 인서트 모듈
│       ├── parser/
│       │   ├── attachment-scraper.ts # 웹페이지 첨부파일 다운로드 링크 동적 스크래퍼
│       │   ├── chunker.ts            # RAG용 헤더 기반 텍스트 슬라이딩 청커
│       │   └── document-parser.ts    # PDF / HWP / HWPX / DOCX 멀티포맷 텍스트 추출기
│       ├── pipeline/
│       │   └── document-processor.ts # 문서 파싱 ➔ 청킹 ➔ AI 분석 일괄 처리 파이프라인
│       └── db.ts                     # Prisma Client 인스턴스
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vercel.json                       # Vercel Cron 스케줄러 설정 (0 0 * * *)
```

---

## ⚙️ 환경 변수 설정 (.env)

프로젝트 루트의 `.env` 파일에 아래 필수 환경 변수를 설정합니다.

```env
# Database (PostgreSQL / Supabase)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Google Gemini AI
GEMINI_API_KEY="your-gemini-api-key"
AI_GENERAL_MODEL="gemini-2.5-flash"

# Public OpenAPI Keys
BIZINFO_API_KEY="your-bizinfo-api-key"
KSTARTUP_API_KEY="your-kstartup-api-key"

# Vercel Cron Secret (프로덕션 환경)
CRON_SECRET="your-cron-secret-token"
```

---

## 🚀 시작하기 (Getting Started)

### 1. 패키지 설치
```bash
npm install
```

### 2. Prisma DB 스키마 동기화 & 클라이언트 생성
```bash
npx prisma generate
npx prisma db push
```

### 3. 실시간 공공 공고 일괄 수집 (Initial Bulk Ingestion)
```bash
npx tsx scripts/reset-and-fetch-live.ts
```

### 4. 로컬 개발 서버 실행
```bash
npm run dev
```
브라우저에서 `http://localhost:3000` 접속

---

## 📡 주요 API 엔드포인트

| Method | Endpoint | 설명 |
| :--- | :--- | :--- |
| `GET` | `/api/support-programs` | 검색어(`q`), 지역(`region`), 분야(`category`), 주관기관(`organizer`), 상태(`statusMode`), 페이지네이션 지원 |
| `GET` | `/api/support-programs/[id]` | 지원사업 단건 상세 정보, 출처 및 첨부문서 직링크 자동 리졸브 반환 |
| `POST` | `/api/support-programs/[id]/analyze` | 해당 공고의 첨부문서 동적 스크래핑 & Gemini AI 실시간 심층 분석 실행 |
| `GET` | `/api/download` | 공공 포털 첨부파일 1-Click 원클릭 직접 다운로드 프록시 스트림 |
| `GET` | `/api/filters` | DB에 저장된 카테고리, 지역, 소관기관별 실시간 공고 개수 집계 반환 |
| `GET` | `/api/cron/ingest` | Vercel Cron 전용 OpenAPI 증분 수집 및 DB 동기화 엔드포인트 |
| `POST` | `/api/pipeline/process-documents` | 미처리 첨부문서(`PENDING`) 일괄 파싱 및 AI 분석 트리거 |