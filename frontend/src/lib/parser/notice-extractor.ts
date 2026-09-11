/**
 * 공고문 선택 발췌 엔진 (Notice Selective Extractor)
 *
 * 목적: 공고문 전문을 통째로 AI 에 넘기지 않고, 사업계획서 작성에 실제로
 * 필요한 섹션만 골라 넘겨 토큰을 절감하고 환각을 줄인다.
 *
 * 실제 DB 데이터(공고 150건, 문서 3,000건)를 조사해서 설계했다:
 *  - 공고 1건당 평균 추출 텍스트가 192,319자인데 AI 에는 60,000자만 넘어간다.
 *    즉 2/3 가 조용히 잘려나가고, 150건 중 39건은 뒷부분(배점표·일정표가 흔히
 *    위치하는 곳)을 AI 가 아예 보지 못한다.
 *  - 텍스트 용량 상위를 차지하는 건 포스터 이미지(.png/.jpg)다. 이미지 바이너리가
 *    UTF-8 로 강제 디코딩돼 "PNG\r\n\n\rIHDR..." 같은 쓰레기가 최대 59만 자까지
 *    저장돼 있고 상태는 PARSED 로 찍혀 있다. 그대로 AI 호출에 실렸다.
 *  - 나머지 상당수는 빈 신청서 양식·개인정보 동의서·법령 규정집이다.
 *    (`해당없음□`, `작성지침`, `개인정보제3자제공내역`, `지원금반납서약` 등이 상위 빈도)
 */

/** 문서 분류 */
export type DocumentKind =
  | "NOTICE" // 공고문 본문 - 최우선
  | "GUIDE" // 모집요강 / 사업 안내
  | "FORM" // 신청서·양식·동의서·서약서 (목차만 쓸모 있음)
  | "REGULATION" // 법령·규정·매뉴얼 (제외)
  | "BINARY_GARBAGE"; // 이미지 등 바이너리가 텍스트로 잘못 저장된 것 (제외)

/** 섹션 분류 */
export type SectionKind =
  | "OVERVIEW" // 사업개요 / 목적 / 내용
  | "ELIGIBILITY" // 지원대상 / 신청자격 / 지원제외
  | "FUNDING" // 지원규모 / 지원금액 / 사업비
  | "SCHEDULE" // 추진일정 / 접수기간 / 사업기간
  | "EVALUATION" // 선정기준 / 평가 / 배점표
  | "EXTRA_POINTS" // 가점 / 우대사항
  | "SUBMISSION" // 제출서류 (목록만 간략히)
  | "BOILERPLATE"; // 작성요령 / 개인정보 / 문의처 등 - 제외 대상

/** AI 프롬프트에 실제로 넘길 섹션 (우선순위 순서) */
const KEEP_PRIORITY: SectionKind[] = [
  "OVERVIEW",
  "ELIGIBILITY",
  "SCHEDULE",
  "EVALUATION",
  "FUNDING",
  "EXTRA_POINTS",
  "SUBMISSION",
];

export interface ExtractedSection {
  kind: SectionKind;
  heading: string;
  body: string;
}

export interface NoticeExtractionResult {
  /** AI 프롬프트에 넣을 최종 텍스트 */
  promptText: string;
  /** 선택된 섹션들 */
  sections: ExtractedSection[];
  /** 시제품용 사업인지 양산품용 사업인지 (통화에서 대표님이 지적한 구분) */
  productStage: "PROTOTYPE" | "MASS_PRODUCTION" | "UNKNOWN";
  /** 공고문 본문을 하나도 못 찾았고 포스터 이미지만 있는 경우 (OCR 필요 신호) */
  needsPosterOcr: boolean;
  /** 절감 통계 */
  stats: {
    originalChars: number;
    keptChars: number;
    reductionPercent: number;
    droppedDocuments: Array<{ fileName: string; kind: DocumentKind; chars: number }>;
  };
}

/**
 * HWP 표에서 자간이 벌어져 나온 "사 업 명" 을 "사업명" 으로 정규화한다.
 * 실제 데이터에 `○ 사 업 명`, `○ 지원예산` 이 섞여 있어 키워드 매칭에 필수다.
 */
export function squeezeHangul(s: string): string {
  return s.replace(/([가-힣])\s+(?=[가-힣])/g, "$1");
}

/**
 * 프롬프트에 넣기 전 공백을 정리한다.
 *
 * PDF 에서 뽑은 텍스트에는 글자 사이마다 탭이 끼어 있어
 * (`지원대상 \t 과제 \t 중복성`) 내용은 그대로인데 토큰만 몇 배로 먹는다.
 */
export function normalizeWhitespace(s: string): string {
  return s
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t 　]+/g, " ") // 탭·전각공백 등을 보통 공백 하나로
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n") // 빈 줄 3개 이상은 2개로
    .trim();
}

/**
 * 이미지/바이너리가 텍스트로 잘못 저장된 것인지 판별한다.
 *
 * 실측: 포스터 .png/.jpg 의 extractedText 는 한글 비율 0.11~0.15% 에 PNG/JPEG
 * 시그니처로 시작한다. 정상 공고문은 한글 비율이 통상 30% 이상이다.
 */
export function isBinaryGarbage(text: string): boolean {
  if (!text) return false;
  const head = text.slice(0, 64);

  // 파일 시그니처가 그대로 남아있는 경우 (가장 확실한 신호)
  if (/^(PNG\r\n|\x89PNG|GIF8|BM|Exif|II\*|MM\x00|%PDF|PK\x03\x04|\xFF\xD8\xFF)/.test(head)) return true;
  if (head.includes("IHDR") || head.includes("ICC_PROFILE") || head.includes("JFIF")) return true;

  // 길이가 어느 정도 되는데 한글이 사실상 없으면 바이너리로 본다
  if (text.length < 200) return false;
  const sample = text.slice(0, 20000);
  const hangul = (sample.match(/[가-힣]/g) || []).length;
  const hangulRatio = hangul / sample.length;
  if (hangulRatio > 0.05) return false;

  // 한글이 거의 없으면서 제어문자/비출력 문자가 많으면 바이너리
  const control = (sample.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g) || []).length;
  return control / sample.length > 0.02;
}

// "사업계획서" 는 공고문이 아니라 작성해야 할 빈 양식이다.
// (실측: `별첨1. 사업계획서(베트남 테크페스트).hwpx` 가 공고문으로 오분류되어
//  "※ 예시 :", "□ 투자유치 l □ 파트너 발굴" 같은 빈 양식이 프롬프트에 새어들었다)
const FORM_NAME =
  /(신청서|지원서|사업계획서|참가신청|양식|서식|동의서|서약서|확인서|증빙|별지|위임장|명세서|점검표|체크리스트|보도문안)/;
// "법률" 만으로 거르면 `법률지원사업`, `법률상담회` 같은 정상 공고가 규정집으로
// 오분류된다(실측 확인). 실제 법령 문서는 "법률 제12345호" 형태를 띤다.
const REGULATION_NAME =
  /(규정|지침|시행령|시행규칙|법률\s*제?\s*\d|고시|매뉴얼|약관|안내서|운영요령)/;
const NOTICE_NAME = /(공고|모집|요강|안내문?)/;
const IMAGE_NAME = /\.(png|jpe?g|gif|bmp|webp|tiff?)$/i;
/** 포스터/홍보물은 그림이라 텍스트가 안 나온다. PDF 로 저장된 것도 포함된다. */
const POSTER_NAME = /(포스터|홍보물|웹전단|리플렛|리플릿|배너|전단지)/;

/** 본문이라 부를 만한 최소 길이. 이보다 짧으면 내용이 없는 것으로 본다. */
const MIN_BODY_CHARS = 200;

/** 파일명이 포스터·홍보물인지 (확장자 무관) */
export function isPosterName(fileName: string): boolean {
  return POSTER_NAME.test(squeezeHangul(fileName || ""));
}

/**
 * 첨부문서 하나를 분류한다. AI 에 넘길 가치가 있는지 여기서 1차로 거른다.
 */
export function classifyDocument(fileName: string, text: string): DocumentKind {
  const name = squeezeHangul(fileName || "");

  if (IMAGE_NAME.test(name) || isBinaryGarbage(text)) return "BINARY_GARBAGE";
  // 텍스트 레이어가 없는 포스터 PDF 는 본문이 0자로 나온다. 이미지와 같게 취급한다.
  if (POSTER_NAME.test(name) && text.trim().length < MIN_BODY_CHARS) return "BINARY_GARBAGE";
  if (REGULATION_NAME.test(name)) return "REGULATION";
  if (FORM_NAME.test(name)) return "FORM";
  if (NOTICE_NAME.test(name)) return "NOTICE";

  // 파일명으로 판단이 안 되면 본문 내용으로 추정한다
  const head = squeezeHangul(text.slice(0, 3000));
  if (/(지원대상|신청자격|지원내용|모집분야|추진일정|선정기준)/.test(head)) return "NOTICE";
  if (/(개인정보|수집.?이용|제3자\s*제공|동의함|서약)/.test(head)) return "FORM";
  return "GUIDE";
}

/**
 * 섹션 본문이 "채워 넣어야 할 빈 양식"인지 판별한다.
 * 파일명으로 못 거른 양식이 섹션 단위로 섞여 들어오는 걸 막는다.
 */
export function isFormTemplateBody(body: string): boolean {
  const b = body.trim();
  if (b.length < 40) return false;
  const per1k = (re: RegExp) => ((b.match(re) || []).length / b.length) * 1000;

  // 빈 체크박스가 빽빽하거나, 작성 안내 문구가 반복되면 양식으로 본다.
  // 임계값은 실측 기준이다: 정상 공고문도 자격 요건 나열에 □ 를 쓰지만
  // 1,000자당 3개를 넘는 경우는 드물고, 빈 양식은 6개를 훌쩍 넘는다.
  if (per1k(/□/g) > 3.5) return true;
  // 한 줄에 체크박스가 여러 개 연달아 나오면 선택 입력란이다 ("□ 투자유치 □ 파트너 발굴")
  if (/□[^\n□]{0,20}□[^\n□]{0,20}□/.test(b)) return true;
  if (/(작성\s*부탁|작성하여\s*주시기|기재\s*바랍니다|예시\s*[:：]|해당\s*사항에\s*[✓√V]|아래\s*표에\s*작성)/.test(b)) return true;
  // 밑줄/괄호만 늘어선 입력란
  if (per1k(/[_]{3,}|\(\s{3,}\)/g) > 4) return true;
  return false;
}

/** 섹션 제목 -> 분류 매핑. 실제 공고문에서 관측된 표현을 기준으로 했다. */
const SECTION_RULES: Array<{ kind: SectionKind; pattern: RegExp }> = [
  // 제외 대상을 먼저 판정해야 한다 ("서류 작성요령" 이 제출서류로 잡히면 안 됨)
  { kind: "BOILERPLATE", pattern: /(작성요령|작성지침|작성방법|기재요령|개인정보|수집.?이용|제3자\s*제공|동의|서약|문의처|접수처|제출처|담당자|기타사항|참고사항|붙임|첨부목록)/ },
  { kind: "EVALUATION", pattern: /(선정기준|평가기준|평가방법|심사기준|배점|평가표|선정평가|심사위원|선정절차|평가항목)/ },
  { kind: "EXTRA_POINTS", pattern: /(가점|가산점|우대|우선선정)/ },
  { kind: "SCHEDULE", pattern: /(추진일정|사업기간|신청기간|접수기간|모집기간|선정일정|세부일정|운영기간|협약기간|일정)/ },
  { kind: "ELIGIBILITY", pattern: /(지원대상|신청자격|참가자격|응모자격|신청대상|모집대상|지원제외|제외대상|결격|참여제한|자격요건)/ },
  { kind: "FUNDING", pattern: /(지원규모|지원금액|지원한도|사업비|지원예산|예산|보조금|지원조건|자부담)/ },
  { kind: "SUBMISSION", pattern: /(제출서류|구비서류|신청방법|접수방법|신청절차)/ },
  { kind: "OVERVIEW", pattern: /(사업개요|사업목적|사업내용|추진배경|개요|목적|사업명|지원내용|모집분야|사업소개|추진방향)/ },
];

function classifySection(heading: string): SectionKind {
  const h = squeezeHangul(heading);
  for (const rule of SECTION_RULES) {
    if (rule.pattern.test(h)) return rule.kind;
  }
  return "BOILERPLATE";
}

/** 섹션 제목처럼 보이는 줄인지 판별 (□ ○ ■ 1. 가. Ⅰ. 등) */
const HEADING_LINE =
  /^\s*(?:[□○◦●■▣▶▪◆◇]\s*|[0-9]{1,2}\s*[.)]\s+|[가-힣]\s*[.)]\s+|[ⅠⅡⅢⅣⅤⅥ]+\s*[.)]?\s*|\[[^\]]{2,20}\]\s*)(.{2,40})$/;

/**
 * 공고문 본문을 섹션 단위로 쪼갠다.
 */
export function splitIntoSections(text: string): ExtractedSection[] {
  const lines = text.split("\n");
  const sections: ExtractedSection[] = [];
  let current: ExtractedSection | null = null;

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();
    if (!trimmed) {
      if (current) current.body += "\n";
      continue;
    }

    const m = trimmed.match(HEADING_LINE);
    // 표 안의 숫자(9.91, 0.0079)가 "9." 로 오인되지 않도록 한글이 있어야 제목으로 본다
    const looksLikeHeading = m && /[가-힣]/.test(m[1]) && (m[1].match(/[가-힣]/g) || []).length >= 2;

    if (looksLikeHeading) {
      if (current) sections.push(current);
      const heading = m![1].split(/[:：]/)[0].trim();
      current = { kind: classifySection(heading), heading, body: "" };
    } else if (current) {
      current.body += line + "\n";
    }
  }
  if (current) sections.push(current);

  return sections;
}

/**
 * 시제품 사업인지 양산품 사업인지 판별한다.
 * 통화에서 "시제품 사업인데 양산 쪽으로 사업계획서를 써버리면 안 된다" 고 지적된 부분.
 */
export function detectProductStage(text: string): "PROTOTYPE" | "MASS_PRODUCTION" | "UNKNOWN" {
  const t = squeezeHangul(text);
  const prototype = (t.match(/(시제품|프로토타입|試作|목업|MVP|실증|파일럿|개발단계)/g) || []).length;
  const mass = (t.match(/(양산|대량생산|상용화|판로개척|수출계약|매출확대|생산설비)/g) || []).length;

  if (prototype === 0 && mass === 0) return "UNKNOWN";
  if (prototype > mass * 1.5) return "PROTOTYPE";
  if (mass > prototype * 1.5) return "MASS_PRODUCTION";
  return "UNKNOWN";
}

export interface NoticeDocumentInput {
  fileName: string;
  extractedText: string | null;
}

/**
 * 공고 하나에 딸린 첨부문서 전체에서, AI 에 넘길 텍스트만 뽑아낸다.
 *
 * @param maxChars 프롬프트에 넣을 최대 글자수. 넘치면 KEEP_PRIORITY 순서대로 채운다.
 *                 (기존 코드처럼 앞에서부터 무작정 자르면 뒤쪽 배점표·일정표가 날아간다)
 */
export function extractNoticeForPrompt(
  documents: NoticeDocumentInput[],
  maxChars = 24000
): NoticeExtractionResult {
  const droppedDocuments: NoticeExtractionResult["stats"]["droppedDocuments"] = [];
  let originalChars = 0;
  let usableText = "";
  let sawPosterOnly = false;
  let hasNoticeBody = false;
  /** 아무것도 안 남았을 때 마지막 수단으로 쓸 문서 (양식이라도 없는 것보단 낫다) */
  let fallbackDoc: { text: string; chars: number } | null = null;

  for (const doc of documents) {
    const text = doc.extractedText || "";
    originalChars += text.length;

    const kind = classifyDocument(doc.fileName, text);

    // 본문이라 부를 수 없을 만큼 짧으면 내용이 없는 것으로 본다.
    // 포스터·홍보물을 PDF 로 만들면 텍스트 레이어가 없어 0자로 나오는데,
    // 파일명에 "포스터" 가 없는 경우도 많다. 그림만 든 PDF 는 결국 OCR 이 답이다.
    if (text.trim().length < MIN_BODY_CHARS) {
      const looksImageOnlyPdf = /\.pdf$/i.test(doc.fileName) && text.trim().length === 0;
      if (kind === "BINARY_GARBAGE" || isPosterName(doc.fileName) || looksImageOnlyPdf) {
        sawPosterOnly = true;
      }
      if (text.length > 0) droppedDocuments.push({ fileName: doc.fileName, kind, chars: text.length });
      continue;
    }

    if (kind === "BINARY_GARBAGE") {
      sawPosterOnly = true;
      droppedDocuments.push({ fileName: doc.fileName, kind, chars: text.length });
      continue;
    }
    if (kind === "REGULATION" || kind === "FORM") {
      // 서식·규정집은 본문을 넘기지 않는다. 서식의 목차는 outline-extractor 가 따로 뽑는다.
      droppedDocuments.push({ fileName: doc.fileName, kind, chars: text.length });
      if (kind === "FORM" && (!fallbackDoc || text.length > fallbackDoc.chars)) {
        fallbackDoc = { text, chars: text.length };
      }
      continue;
    }

    hasNoticeBody = true;
    usableText += `\n${text}\n`;
  }

  // 공고문이 하나도 없고 양식만 있는 경우, 빈손으로 돌려주느니 그 양식이라도 쓴다.
  if (!hasNoticeBody && fallbackDoc) {
    usableText = fallbackDoc.text;
  }

  const productStage = detectProductStage(usableText);
  const allSections = splitIntoSections(usableText);

  // 같은 분류끼리 모으고, 제외 대상은 버린다
  const keptByKind = new Map<SectionKind, ExtractedSection[]>();
  const seen = new Set<string>();
  for (const s of allSections) {
    if (s.kind === "BOILERPLATE") continue;
    if (!s.body.trim()) continue;
    // 파일명으로 못 거른 빈 양식이 섹션 단위로 섞여 들어오는 걸 막는다
    if (isFormTemplateBody(s.body)) continue;
    // 같은 제목이 여러 첨부에 반복되면 한 번만 쓴다 (공고문/요약본 중복)
    const key = `${s.kind}|${squeezeHangul(s.heading)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const list = keptByKind.get(s.kind) || [];
    list.push(s);
    keptByKind.set(s.kind, list);
  }

  // 우선순위 순서로 채우되, 한도를 넘으면 거기서 멈춘다
  const sections: ExtractedSection[] = [];
  const chunks: string[] = [];
  let used = 0;

  for (const kind of KEEP_PRIORITY) {
    for (const s of keptByKind.get(kind) || []) {
      // PDF 에서 딸려온 탭·중복 공백을 여기서 걷어내 토큰을 더 줄인다
      const body = normalizeWhitespace(s.body);
      if (!body) continue;
      const block = `### [${kind}] ${normalizeWhitespace(s.heading)}\n${body}`;
      if (used + block.length > maxChars) continue;
      chunks.push(block);
      sections.push(s);
      used += block.length;
    }
  }

  // 섹션 분해에 실패한 경우(제목 없는 평문 등)는 앞부분이라도 넘긴다
  let promptText = chunks.join("\n\n");
  if (!promptText.trim() && usableText.trim()) {
    promptText = normalizeWhitespace(usableText).slice(0, maxChars);
  }

  return {
    promptText,
    sections,
    productStage,
    needsPosterOcr: sawPosterOnly && !hasNoticeBody,
    stats: {
      originalChars,
      keptChars: promptText.length,
      reductionPercent:
        originalChars > 0 ? Math.round((1 - promptText.length / originalChars) * 100) : 0,
      droppedDocuments,
    },
  };
}
