/**
 * 공고에 첨부된 실제 사업계획서 서식을 찾아 칸 구조를 파싱한다.
 *
 * 왜 필요한가:
 * `getStandardFormSchema()`(features/psst/constants.ts)는 공고 제목의 키워드만
 * 보고 미리 정해둔 표준 템플릿 중 하나를 고르는 하드코딩 폴백이다. 그런데 실제
 * 서식에는 `현대차그룹 현업 적용 제안` 같은 그 공고만의 고유 항목이 있고, 표준
 * 템플릿에는 없는 항목이라 지금 구조로는 절대 생성되지 않는다.
 *
 * 이 함수는 공고에 첨부된 진짜 HWPX 서식 파일을 내려받아 `parseHwpxFormSchema`
 * 로 실제 칸 목록을 뽑는다. 실패하면 null 을 반환하니, 호출부는 이때 표준
 * 템플릿으로 폴백하면 된다.
 */

import { safeFetch } from "@/lib/security/safe-fetch";
import { extractZipEntry } from "@/lib/parser/document-parser";
import { parseHwpxFormSchema, type FormSchema } from "@/lib/parser/form-schema-parser";

export interface FormCandidateDoc {
  fileName: string;
  fileUrl: string;
  entryPath: string | null;
  fileType: string;
}

/** 사업계획서 서식으로 볼 만한 파일명. "사업계획서"를 최우선으로, 없으면 신청서류로 넓힌다. */
const BUSINESS_PLAN_NAME = /사업\s*계획\s*서/;
const GENERIC_FORM_NAME = /(신청서|참가신청|사업\s*신청)/;

/**
 * 채울 칸(NARRATIVE)이 이 정도는 나와야 "쓸만한 서식"으로 인정한다.
 *
 * 실측 확인: 설비 현황 등 표 위주 서식(예: "사업분야별 사업계획서")에서는
 * "순이익", "기타" 처럼 지시문이 거의 없는 항목이 NARRATIVE 로 잘못 잡히면서
 * 개수만 기준을 넘는 경우가 있었다. 그래서 개수뿐 아니라 지시문이 실제로
 * 붙어있는(guidance 가 어느 정도 긴) 칸이 이만큼은 있어야 인정한다.
 */
const MIN_NARRATIVE_FIELDS = 2;
const MIN_GUIDANCE_LENGTH = 10;

/** 같은 공고를 대화 턴마다 매번 다시 내려받지 않도록 짧게 캐시한다 */
const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, { schema: FormSchema | null; expiresAt: number }>();

function pickCandidates(documents: FormCandidateDoc[]): FormCandidateDoc[] {
  const hwpxDocs = documents.filter((d) => d.fileType === "HWPX");
  const businessPlanDocs = hwpxDocs.filter((d) => BUSINESS_PLAN_NAME.test(d.fileName));
  const genericFormDocs = hwpxDocs.filter(
    (d) => !BUSINESS_PLAN_NAME.test(d.fileName) && GENERIC_FORM_NAME.test(d.fileName)
  );
  // 사업계획서 이름이 붙은 것부터, 그다음 일반 신청서류 순으로 최대 3개까지 시도한다
  return [...businessPlanDocs, ...genericFormDocs].slice(0, 3);
}

async function fetchAndParse(doc: FormCandidateDoc): Promise<FormSchema | null> {
  try {
    const res = await safeFetch(doc.fileUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://www.bizinfo.go.kr",
      },
    });
    if (!res.ok) return null;

    let buf: Buffer = Buffer.from(await res.arrayBuffer());
    if (doc.entryPath) {
      const inner = extractZipEntry(buf, doc.entryPath);
      if (!inner) return null;
      // adm-zip 이 돌려주는 Buffer 도 항상 ArrayBuffer 기반이라 타입만 좁힌다
      buf = inner as Buffer<ArrayBuffer>;
    }
    if (buf.slice(0, 2).toString("latin1") !== "PK") return null; // HWPX 가 아니면 포기

    const schema = parseHwpxFormSchema(buf, doc.fileName);
    const wellGuidedCount = schema.fields.filter(
      (f) => f.type === "NARRATIVE" && f.guidance.length >= MIN_GUIDANCE_LENGTH
    ).length;
    return wellGuidedCount >= MIN_NARRATIVE_FIELDS ? schema : null;
  } catch (e: any) {
    console.warn(`[FormSchema] '${doc.fileName}' 서식 다운로드/파싱 실패:`, e.message);
    return null;
  }
}

/**
 * 첨부문서 목록에서 실제 사업계획서 서식을 찾아 칸 구조를 반환한다.
 * 찾지 못하거나 칸이 너무 적으면(=파싱이 잘 안 된 것으로 판단) null.
 *
 * @param cacheKey 보통 공고 ID. 같은 공고면 캐시를 재사용해 매 대화 턴마다
 *                 원문 사이트에 다시 접속하지 않는다.
 */
export async function loadRealFormSchema(
  cacheKey: string,
  documents: FormCandidateDoc[]
): Promise<FormSchema | null> {
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.schema;

  const candidates = pickCandidates(documents);
  let result: FormSchema | null = null;
  for (const doc of candidates) {
    result = await fetchAndParse(doc);
    if (result) break;
  }

  cache.set(cacheKey, { schema: result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}
