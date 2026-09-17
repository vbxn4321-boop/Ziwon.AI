# 파이프라인 플로우 (2026-09-17 기준)

코드와 운영 DB를 직접 확인해 정리한 문서다. 추측이 아니라 실측(쿼리·로그·실제 호출 결과)으로
검증한 내용만 담았다. 구조가 바뀌면 이 문서도 같이 갱신한다.

## 1. 시스템 구성

```
Python FastAPI (Railway)     ← 수집·스크래핑, APScheduler
        ↕
Supabase Postgres            ← 공용 저장소
        ↕
Next.js 15 (Vercel)          ← AI 분석·사용자 화면
```

Python은 SQLAlchemy 생 SQL, TS는 Prisma로 **같은 DB를 각자 다른 ORM으로** 쓴다. 스키마를
바꿀 때 양쪽 모두 확인해야 한다. 스크래핑·파싱 로직도 일부 이중 구현이라(예: ZIP 해제),
한쪽만 고치면 나머지가 남는 문제가 반복됐다.

## 2. 자동 수집 파이프라인 (매시간, `backend/app/services/scheduler_service.py`)

```
:00  크롤러          기업마당 + K-Startup 병렬 수집
      └ externalId 대조로 신규만 적재 → SupportProgram + SupportSource

:30  첨부 스크래핑    20건/회 (scraper_service.run_pre_scraping_batch)
      └ 대상 ① 첨부 행이 아예 없는 공고
             ② 압축 못 푼 .zip / 과거 버그로 .zip.hwpx 된 손상 행
      └ 다운로드 → 텍스트 추출 → SupportDocument.extractedText, status=PARSED
      └ 실패 시 NOTICE_ONLY 행을 남겨 무한 재시도를 끊음

:45  AI 분석 배치     5건/회, 문서 단위 루프 (Python → Vercel HTTP 호출)
      └ POST /api/pipeline/process-documents?limit=5
         헤더 x-internal-cron-key, admin-guard.ts 가 크론 경로로 인정
         (INTERNAL_CRON_SECRET 이 32자 미만이면 이 경로가 조용히 안 먹고 401)
      └ 같은 공고에 첨부가 여러 개여도 이미 분석이 있으면 건너뜀
      └ notice-extractor 로 발췌(+개인정보 마스킹) → Gemini → SupportAnalysis 저장
```

**중복 제거(dedup)는 이 루프에 없다.** `dedup_service.find_duplicate_pairs` /
`merge_duplicates`는 `backend/app/api/v1/admin.py`를 통한 관리자 수동 호출뿐이다.

## 3. 사용자 작성 플로우

```
공고 탐색 (/)
   └ 필터·검색 → 카드

공고 상세 (/programs/[id])
   ├ 원문 뷰어 · 첨부서류 · 출처 탭
   └ [AI 합격 전략 리포트 분석하기]
        └ POST /api/support-programs/[id]/analyze   ★로그인 필수
             ├ 캐시 있음 → Gemini 생략, 이용권만 발급 (토큰 0)
             └ 캐시 없음 → 스크래핑·추출 → Gemini → 저장 → 이용권 발급

   └ [PSST 사업계획서 작성]
        └ GET  /api/support-programs/[id]/analysis-access
             ├ unlocked → 그대로 스튜디오
             └ 아니면  → 안내 모달 [지금 분석하기] / [에디터로 진행]

계획서 스튜디오 (/consultant)
   ├ 서버가 이용권 재확인 (URL 파라미터를 믿지 않음)
   │
   ├ unlocked:   [≡] │ AI 챗봇 │ 대화의 목차 │ 에디터   (4분할, 손잡이로 리사이즈)
   │              └ psst-chat 이 서식 칸 기반으로 1:1 질문
   │              └ fieldProgress 로 "지금 어느 칸을 다루는지" 표시
   │              └ psst-chat 라우트도 이용권을 재확인해 버튼 우회를 막음
   │
   └ editorOnly: [≡] │ 에디터
                  └ 챗봇·목차 없음 (AI 분석을 안 연 계정)

   └ 저장 SavedPsstPlan  /  내보내기 POST /api/export/hwpx (HWPX 조립)
```

### AI 분석 이용권 (`UserProgramAnalysis`)

`SupportAnalysis`(공고 단위 결과 캐시)와 `UserProgramAnalysis`(계정 단위 이용권)를
의도적으로 분리했다.

- 과금은 계정별: A가 분석한 공고를 B가 열려면 B도 따로 열어야 한다.
- Gemini 호출은 공고당 1회: B가 열 때는 A가 만든 캐시를 재사용하므로 토큰 0원.
- `consumedTokens` 컬럼으로 이번 발급이 실제 호출이었는지(true) 재사용이었는지(false)
  구분해 둔다. 나중에 계정별 실제 비용을 따질 때 쓴다.

이용권 발급 실패는 **치명적으로 처리하지 않는다**(`analysis-access.ts:grantAnalysisAccess`).
분석 자체는 이미 Gemini 호출과 DB 저장이 끝난 뒤의 마지막 단계라, 여기서 예외를 올리면
토큰을 쓰고 결과까지 저장해놓고 사용자에게는 500을 보여주는 상황이 된다(2026-09-16 실제
발생, `UserProgramAnalysis` 테이블이 배포 전 상태였을 때 재현됨). 실패해도 분석 결과는
그대로 반환하고, 발급 실패는 로그만 남긴다 — 다음에 다시 열면 캐시 히트라 토큰 없이
재발급된다.

## 4. 서식 파싱 → 챗봇 인터뷰 (이 프로젝트의 핵심 차별점)

```
공고 첨부 HWPX (빈 사업계획서 양식)
   └ load-form-schema     사업계획서/신청서 이름으로 후보 3개까지 시도
   └ form-schema-parser   ZIP 해제 → section*.xml → <hp:tbl> 표 구조 복원
        └ 칸 라벨 + ※ 작성지침 + 칸 성격 판정
             FACT / NARRATIVE / PERSONAL / ATTACHMENT / CONSENT
        └ 표 머리글·연도 표기(’25년, 신청일 현재 등) 같은 비필드는 제외
   └ isAiSafeField() 로 PERSONAL·CONSENT 를 Gemini 전송에서 제외
   └ 남은 칸이 챗봇 질문 순서이자 화면의 "대화의 목차"
```

**2단계 AI 분리**(토큰 절감 목적)가 이미 구조적으로 지켜지고 있다: 서식 파싱(1단계)은
정규식·XML 파싱만 쓰고 Gemini를 부르지 않는다. Gemini는 질문 생성(2단계)에서만 호출된다.

**개인정보 마스킹은 두 겹**이다.
1. 서식 칸 단위: `PERSONAL`/`CONSENT` 타입 칸은 애초에 프롬프트에 안 실림 (`isAiSafeField`)
2. 공고문 본문 단위: `notice-extractor.ts:maskPersonalInfo()` — 담당자 연락처가
   `문의처` 섹션이 아니라 본문 문단 한가운데 끼워진 경우까지 정규식으로 가림
   (이메일·유선·휴대폰·주민번호·문의 맥락의 실명)

## 5. 오늘(09-17) 발견하고 고친 것: 분석 경로 불일치

같은 `analyzeProgramWithGemini()`를 부르는데 호출부가 둘이라 실제 동작이 달랐다.

| | 배치 (`document-processor.ts`) | 온디맨드 (`analyze/route.ts`) |
|---|---|---|
| Gemini 인자 | 첨부문서 배열까지 넘김 | ~~텍스트 블롭 하나만~~ → **배열도 넘기게 수정** |
| 발췌 방식 | 섹션 선별 발췌 | ~~통째로 폴백~~ → **동일하게 섹션 선별** |
| 저장되는 model 값 | `"gemini-2.5-flash"` 하드코딩 (실재하지 않는 이름) | `"gemini-3.6-flash"` 하드코딩 (실제 응답 모델과 무관) |

실측(문제가 보고된 그 공고, 첨부 HWP+PDF):
```
수정 전 (블롭만 전달):  발췌 8,940/9,087자 (2% 절감),  섹션 0개
수정 후 (배열 전달):    발췌 1,742/8,429자 (79% 절감), 섹션 0개
```
`섹션 0개`는 이 특정 PDF가 헤딩 정규식에 안 걸리는 별개 이슈로 남아 있다(배치였어도
동일했을 것). 절감율 자체는 정상 범위로 돌아왔다.

**모델 기록**도 함께 고쳤다. `getCandidateModels("fast")`의 실제 후보 목록
(`gemini-3.7-flash → 3.6 → 3.5 → 3.5-lite → flash-latest → 2.0-flash`)에
`gemini-2.5-flash`는 없다 — 존재하지 않는 이름이 `SupportAnalysis.model`에 계속
저장되고 있었다. `analyzeProgramWithGemini()`가 이제 `{ result, modelUsed }`를
반환하고, 두 호출부 모두 카스케이드에서 실제로 응답한 모델명을 그대로 저장한다.

변경 파일: `frontend/src/lib/ai/gemini-analyzer.ts`,
`frontend/src/lib/pipeline/document-processor.ts`,
`frontend/src/app/api/support-programs/[id]/analyze/route.ts`

## 6. 알려진 채무 (해결 안 됨, 우선순위 순)

1. **`ai/*` 라우트 대부분 무인증** — `psst-chat`은 이용권을 재확인하도록 고쳤지만
   `psst-plan`, `psst-schema`, `match`, `import-plan`은 여전히 열려 있다. 유료
   티어링을 넓히려면 여기부터 막아야 한다.
2. **첨부 본문 확보율 53%** (2026-09-16 실측, 문서 5,186건 중 2,430건 텍스트 없음).
   HWP가 2,562건 중 1,231건 공백으로 단일 최대 항목 — 구형 HWP 바이너리 파서가
   가장 수익이 큰 다음 작업.
3. **AI 분석 배치가 5건/시간** — 신규 유입 69건/일 대비 배치 처리량 120건/일이라
   순증은 하지만, 기존 백로그(3천여 건)를 줄이려면 배치 크기 상향이 필요.
   (다만 대표님 방침상 AI 분석은 유료화 대상이라 우선순위는 보류 중.)
4. **파서 테스트 커버리지 0** — `form-schema-parser.ts`, `notice-extractor.ts`는
   최근 변경이 가장 잦은 파일인데 자동 테스트가 없다. 검증을 매번 임시 스크립트로
   DB를 조회해 확인하는 중 (`scripts/__tmp-*.ts`, 확인 후 삭제하는 관례).
5. **`frontend/src/components/psst/`** — `features/psst`로 이전 후 안 지운 빈
   디렉터리 (git 미추적, import 없음).
