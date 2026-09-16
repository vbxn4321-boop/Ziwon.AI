/**
 * 서식(사업계획서 양식) 구조 파서
 *
 * 공고에 첨부된 빈 서식을 읽어 "채워야 할 칸 목록"을 뽑아낸다.
 * AI 챗봇이 이 칸들을 근거로 질문하고, 채운 결과를 에디터가 칸 단위로 보여준다.
 *
 * 왜 필요한가:
 * 고정된 PSST(Problem/Solution/Scale-up/Team) 템플릿으로는 공고마다 다른 고유 항목을
 * 채울 수 없다. 실제 서식에서 `현대차그룹 현업 적용 제안` 같은 항목이 발견되는데,
 * 표준 템플릿에는 없는 항목이라 지금 구조로는 아예 생성되지 않는다.
 *
 * 서식은 각 칸마다 `※` 로 시작하는 작성 지시문을 달고 있다. 이건 주관기관이 직접
 * 쓴 요구사항이라 우리가 추측해 만든 프롬프트보다 훨씬 정확한 지시문이 된다.
 */

import { XMLParser } from "fast-xml-parser";
import AdmZip from "adm-zip";

/** 칸의 성격. 누가 채우는지가 달라진다. */
export type FormFieldType =
  | "FACT" // 기업명·사업자등록번호 등 사실 정보 → 회사 프로필에서 자동 채움
  | "NARRATIVE" // 제품 소개·차별성 등 서술형 → AI 챗봇이 작성
  | "PERSONAL" // 대표자 성명·연락처 등 개인정보 → 사용자가 직접 입력, AI 에 넘기지 않음
  | "ATTACHMENT" // 제품 이미지·증빙서류 → 사용자가 직접 첨부
  | "CONSENT"; // 개인정보 동의서 등 → AI 관여 없이 원문 유지

/** AI 프롬프트에 넣어도 되는 칸인지. PERSONAL·CONSENT 는 넘기지 않는다. */
export function isAiSafeField(type: FormFieldType): boolean {
  return type !== "PERSONAL" && type !== "CONSENT";
}

export interface FormField {
  /** 칸 식별자 */
  id: string;
  /** 칸 이름 (예: "제품(서비스) 차별성") */
  label: string;
  /** 서식에 적힌 작성 지시문 (`※` 문구). AI 프롬프트로 그대로 쓴다. */
  guidance: string;
  type: FormFieldType;
  /** 서식에 들어있던 예시값 (예: "1234.01.01", "00특구(00시 00구 00동)") */
  placeholder?: string;
  /** 속한 상위 섹션 (예: "제품‧서비스 개요") */
  sectionTitle?: string;
  /** 원본 HWPX 표에서의 위치(행/열). 결과 조립 시 입력 순서와 표 구조를 보존하는 데 사용한다. */
  row?: number;
  col?: number;
}

export interface FormSchema {
  title: string;
  fields: FormField[];
  /** 서식 전체에 걸린 제약 (예: "분량 5page 내외", "양식의 목차·표 변경 불가") */
  constraints: string[];
  /** 파싱 중 판단이 애매했던 지점 */
  warnings: string[];
}

/** HWP 구형 인코딩 추출에서 생기는 모지바케 문구를 화면에 노출하지 않는다. */
function cleanExtractedLabel(value: string, index: number): string {
  const text = value.replace(/\s+/g, " ").trim();
  const suspicious = /[ÃÂÐÑæåçèéìíîï譁蜿莠帙繧謗莨]|�/.test(text);
  const korean = (text.match(/[가-힣]/g) || []).length;
  if (suspicious && korean < 2) return `서식 작성 항목 ${index + 1}`;
  return text || `서식 작성 항목 ${index + 1}`;
}

/** 사실 정보 칸으로 볼 라벨 */
const FACT_LABEL =
  /(기업명|회사명|상호|사업자등록번호|법인등록번호|대표자|성명|생년월일|이메일|연락처|전화|휴대폰|주소|소재지|설립|개업연월일|회사성립연월일|업종|업태|직원\s*수|종업원|매출|투자유치|자본금|담당자|직위|기술\s*분야)/;

/**
 * 개인을 특정할 수 있는 칸. AI 에 절대 넘기지 않는다.
 *
 * 이런 칸은 본인이 직접 적어야 하는 정보이고 AI 가 대신 써줄 수도 없는데,
 * 프롬프트에 섞여 들어가면 챗봇이 "대표자 성함이 어떻게 되시나요", "연락처를
 * 알려주세요" 같은 엉뚱한 질문을 하게 된다. 최종 편집 화면에서 사용자가
 * 직접 채우는 것이 맞다.
 */
const PERSONAL_INFO_LABEL =
  /(대표자|성명|이름|생년월일|주민등록|이메일|메일|연락처|전화|휴대폰|핸드폰|팩스|주소|소재지|담당자|서명|날인)/;

/** 첨부물 칸 */
const ATTACHMENT_LABEL = /(사진|이미지|로고|첨부|증빙|캡처|도면|스크린샷)/;

/** 동의서 영역 */
const CONSENT_LABEL = /(개인정보|동의서|수집.?이용|제3자\s*제공|서약|청렴|보안각서)/;

/** 값이 아니라 "빈칸 표시"에 해당하는 내용 */
const PLACEHOLDER_VALUE =
  /^(\s*|[\-_\.·\s]*|년\s*월\s*일|백만원|천원|원|명|개|건|%|\(?\s*\)?|0+[^\d]*|00[^\d]*|1234[\.\-]\d+[\.\-]\d+|예\s*[:：].*|공\s*란|해당\s*없음)$/;

/**
 * 한 셀 안에 흩어진 텍스트 조각(`<hp:t>`)을 모아 하나의 문자열로 만든다.
 */
function collectText(node: any): string {
  if (node == null) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(collectText).join("");

  let out = "";
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith("@_")) continue; // 속성은 건너뛴다
    // 줄바꿈 태그는 공백으로
    if (key === "hp:lineBreak" || key === "hp:tab") {
      out += " ";
      continue;
    }
    // 레이아웃 정보는 텍스트가 아니다
    if (key === "hp:linesegarray" || key === "hp:lineseg") continue;
    out += collectText(value);
  }
  return out;
}

/**
 * 셀 텍스트의 공백을 정리한다.
 *
 * HWP 표에서 `사 업 명` 처럼 자간을 벌려 쓴 라벨은 붙여줘야 하지만,
 * 일반 문장의 단어 사이 공백까지 지우면 `제품(서비스)명등일반현황및...` 처럼
 * 내용이 뭉개진다. 그래서 문자열 전체가 한 글자씩 떨어져 있을 때만 붙인다.
 */
function normalizeLabel(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (/^[가-힣](?:\s[가-힣])+$/.test(t)) return t.replace(/\s/g, "");
  return t;
}

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

interface TableCell {
  row: number;
  col: number;
  text: string;
}

/** 트리를 훑어 모든 표를 찾아 격자로 만든다 (표 안의 표도 포함) */
function collectTables(node: any, out: TableCell[][][] = []): TableCell[][][] {
  if (node == null || typeof node !== "object") return out;

  if (Array.isArray(node)) {
    for (const item of node) collectTables(item, out);
    return out;
  }

  for (const [key, value] of Object.entries(node)) {
    if (key === "hp:tbl") {
      for (const tbl of asArray(value as any)) {
        const cells: TableCell[] = [];
        for (const tr of asArray((tbl as any)["hp:tr"])) {
          for (const tc of asArray((tr as any)["hp:tc"])) {
            const addr = (tc as any)["hp:cellAddr"];
            const row = Number(addr?.["@_rowAddr"] ?? -1);
            const col = Number(addr?.["@_colAddr"] ?? -1);
            // 셀 안의 중첩 표는 따로 수집하고, 본문 텍스트만 셀 값으로 쓴다
            const sub = (tc as any)["hp:subList"];
            collectTables(sub, out);
            cells.push({ row, col, text: normalizeLabel(collectText(sub)) });
          }
        }
        if (cells.length > 0) {
          const maxRow = Math.max(...cells.map((c) => c.row));
          const grid: TableCell[][] = Array.from({ length: maxRow + 1 }, () => []);
          for (const c of cells) if (c.row >= 0) grid[c.row].push(c);
          for (const r of grid) r.sort((a, b) => a.col - b.col);
          out.push(grid);
        }
      }
      continue;
    }
    collectTables(value, out);
  }
  return out;
}

/**
 * 채울 칸이 아닌데 표 구조 때문에 라벨처럼 잡히는 것들.
 *
 * 실측(베트남 테크페스트 서식): 20칸 중 7칸이 `’25년`, `’24년`, `신청일 현재`,
 * `...` 였다. 매출·고용 현황표의 열 머리글인데 라벨-값 짝짓기에서 라벨 자리에
 * 들어온 것이다. 그대로 두면 프롬프트 토큰만 먹고, 챗봇이 "’25년에 대해
 * 말씀해 주세요" 같은 질문을 하게 된다.
 */
const YEAR_ONLY_LABEL = /^['’"]?\s*\d{2,4}\s*년도?\s*$/;
const PUNCT_ONLY_LABEL = /^[.·…\-–—~\s]*$/;
const TIME_MARKER_LABEL = /^(신청일\s*현재|현재|당해\s*연도|전년도)$/;
/** 지시문이 없을 때만 버릴 표 머리글 */
const TABLE_HEADER_LABEL = /^(구분|계|합계|소계|총계|누계|비고|연번|번호|순번|단위|항목|내용|기타)$/;

function isNonFieldLabel(label: string, guidance: string): boolean {
  if (label.length <= 1) return true;
  if (YEAR_ONLY_LABEL.test(label)) return true;
  if (PUNCT_ONLY_LABEL.test(label)) return true;
  if (TIME_MARKER_LABEL.test(label)) return true;
  // 머리글처럼 보여도 주관기관 지시문이 달렸다면 진짜 채울 칸이다
  if (!guidance && TABLE_HEADER_LABEL.test(label)) return true;
  return false;
}

/** 지시문이 붙어 있어도 서술할 내용이 아닌, 날짜·번호류 사실정보 칸 */
const PURE_FACT_LABEL = /(연월일|년월일|일자|등록번호|법인번호|사업자번호)/;

/** 라벨을 보고 칸의 성격을 정한다 */
function decideType(label: string, guidance: string, sectionTitle: string): FormFieldType {
  const all = `${label} ${sectionTitle}`;
  if (CONSENT_LABEL.test(all)) return "CONSENT";
  if (ATTACHMENT_LABEL.test(all)) return "ATTACHMENT";

  // 라벨 자체가 개인정보 항목명인 짧은 칸(`이메일`, `연락처(휴대폰)`, `생년월일`)은
  // 지시문이 있든 없든 개인정보로 본다.
  const isShortLabel = label.replace(/[^가-힣A-Za-z]/g, "").length <= 10;
  if (isShortLabel && PERSONAL_INFO_LABEL.test(label)) return "PERSONAL";

  // `개업연월일(회사성립연월일)` 처럼 지시문("개인:개업연월일, 법인:회사성립연월일")이
  // 붙어 있어도 날짜 한 줄을 적는 칸이다. 서술형으로 보내면 챗봇이 문단을 요구한다.
  if (label.length <= 20 && PURE_FACT_LABEL.test(label)) return "FACT";

  // 작성 지시문이 달려 있으면 서술형이다. 라벨 키워드보다 이걸 먼저 본다.
  // (`투자유치 현황 및 계획` 은 "투자유치" 때문에 사실정보로,
  //  `제품(서비스) 및 대표자 소개` 는 "대표자" 때문에 개인정보로 오분류되기 쉬운데,
  //  "...기재" 라는 지시문이 붙어 있으면 실제로는 서술해야 할 칸이다)
  if (guidance.length > 10) return "NARRATIVE";

  if (PERSONAL_INFO_LABEL.test(label)) return "PERSONAL";
  if (FACT_LABEL.test(label)) return "FACT";
  return label.length > 12 ? "NARRATIVE" : "FACT";
}

/**
 * HWPX 서식 파일에서 채울 칸 목록을 뽑는다.
 */
export function parseHwpxFormSchema(hwpxBuffer: Buffer, fileName = ""): FormSchema {
  const warnings: string[] = [];
  const constraints: string[] = [];
  const fields: FormField[] = [];

  let sections: string[] = [];
  try {
    const zip = new AdmZip(hwpxBuffer);
    sections = zip
      .getEntries()
      .filter((e) => /Contents\/section\d*\.xml$/i.test(e.entryName))
      .map((e) => e.getData().toString("utf-8"));
  } catch (err: any) {
    return { title: fileName, fields: [], constraints: [], warnings: [`서식을 열 수 없습니다: ${err.message}`] };
  }

  if (sections.length === 0) {
    return { title: fileName, fields: [], constraints: [], warnings: ["HWPX 안에 본문(section) 이 없습니다."] };
  }

  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const title = fileName;
  let seq = 0;
  /** 표를 훑는 동안 직전에 만난 섹션 제목을 기억해 둔다 */
  let sectionTitleBuffer = "";

  for (const xml of sections) {
    let tree: any;
    try {
      tree = parser.parse(xml);
    } catch (err: any) {
      warnings.push(`본문 XML 해석 실패: ${err.message}`);
      continue;
    }

    const tables = collectTables(tree);

    for (const grid of tables) {
      for (const row of grid) {
        if (row.length === 0) continue;

        // 표 제목만 든 한 칸짜리 행 → 섹션 제목이거나 전체 제약 문구
        if (row.length === 1) {
          const t = row[0].text;
          if (!t) continue;
          if (/^※/.test(t) || /분량|페이지|page|변경\s*또는\s*삭제|작성하여|제출/.test(t)) {
            constraints.push(t.slice(0, 200));
          } else if (t.length <= 40 && !title.includes(t)) {
            sectionTitleBuffer = t;
          }
          continue;
        }

        // 라벨-값 쌍을 뽑는다.
        // 기업 현황표는 `기업명 | (빈칸) | 사업자등록번호 | (빈칸)` 처럼 한 행에
        // 두 쌍 이상이 들어있는 경우가 많다. 앞에서부터 두 칸씩 짝지어 본다.
        const pairs: Array<{ label: string; raw: string }> = [];
        if (row.length >= 4 && row.length % 2 === 0) {
          for (let i = 0; i < row.length; i += 2) {
            pairs.push({ label: row[i].text, raw: row[i + 1]?.text || "" });
          }
        } else {
          pairs.push({
            label: row[0].text,
            raw: row.slice(1).map((c) => c.text).filter(Boolean).join(" ").trim(),
          });
        }

        for (let pairIndex = 0; pairIndex < pairs.length; pairIndex++) {
          const pair = pairs[pairIndex];
          const label = pair.label.replace(/^[□○◦●■▣▶▪◆◇]\s*/, "").trim();
          if (!label || label.length > 40) continue;

          const restJoined = pair.raw.trim();
          // `※`/`-` 로 시작하면 값이 아니라 작성 지시문이다
          const guidance = /^[※\-*]/.test(restJoined) ? restJoined : "";
          const value = guidance ? "" : restJoined;

          // 이미 채워진 칸(예시값이 아닌 실제 값)은 채울 대상이 아니다
          const isFillable = guidance !== "" || !value || PLACEHOLDER_VALUE.test(value);
          if (!isFillable) continue;

          // 표 머리글·연도 표기 등 채울 칸이 아닌 것은 여기서 버린다
          if (isNonFieldLabel(label, guidance)) continue;

          fields.push({
            id: `f${++seq}`,
            label,
            guidance: guidance.replace(/^[※\-*]\s*/, "").trim(),
            type: decideType(label, guidance, sectionTitleBuffer),
            placeholder: value && PLACEHOLDER_VALUE.test(value) ? value : undefined,
            sectionTitle: sectionTitleBuffer || undefined,
            row: row[0]?.row,
            col: row[pairIndex * 2]?.col,
          });
        }
      }
    }
  }

  if (fields.length === 0) {
    warnings.push("채울 칸을 찾지 못했습니다. 표가 없는 서식이거나 구조가 특이할 수 있습니다.");
  }

  return {
    title,
    fields: fields.map((field, index) => ({ ...field, label: cleanExtractedLabel(field.label, index) })),
    constraints: [...new Set(constraints)],
    warnings,
  };
}
