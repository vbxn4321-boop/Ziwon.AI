/**
 * form-schema-parser.ts 회귀 테스트.
 *
 * 합성 HWPX(ZIP + Contents/section0.xml)를 만들어 표 구조 파싱과 칸 성격 판정을
 * 고정한다. 여기 담긴 케이스는 전부 실제 공고 서식에서 한 번씩 잘못 나왔던
 * 것들이고, 손으로 DB를 뒤져 확인한 뒤 고친 내용이다:
 *
 *  - `제품(서비스) 및 대표자소개` 가 "대표자" 때문에 PERSONAL 로 잡혀
 *    서술형 칸 하나가 통째로 사라지던 문제
 *  - `’25년`, `신청일 현재` 같은 표 머리글이 입력 칸으로 잡혀 프롬프트 토큰을
 *    먹고 챗봇이 "’25년에 대해 말씀해 주세요" 같은 질문을 하던 문제
 *  - `개업연월일(회사성립연월일)` 이 지시문 길이 때문에 NARRATIVE 로 잡혀
 *    날짜 한 줄 적을 칸에 문단을 요구하던 문제
 *  - 개인정보 칸(이메일·연락처)이 AI 전송 대상에 포함되던 문제
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const AdmZip = require("adm-zip");

function loadModule(relPath) {
  const source = fs.readFileSync(path.join(__dirname, relPath), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const mod = { exports: {} };
  new Function("exports", "module", "require", compiled)(mod.exports, mod, require);
  return mod.exports;
}

const { parseHwpxFormSchema, isAiSafeField } = loadModule(
  "../../src/lib/parser/form-schema-parser.ts"
);

/**
 * 셀 하나를 HWPX 본문 XML 조각으로 만든다.
 *
 * `hp:cellAddr` 의 행·열 속성은 네임스페이스 접두사 없이 `rowAddr`/`colAddr` 로
 * 쓴다 — 실제 HWPX 가 그렇고, 파서도 `@_rowAddr` 로 읽는다. 접두사를 붙이면
 * 주소가 -1 로 잡혀 표 전체가 통째로 버려진다.
 */
function cell(row, col, text) {
  return `<hp:tc><hp:cellAddr colAddr="${col}" rowAddr="${row}"/>` +
    `<hp:subList><hp:p><hp:run><hp:t>${text}</hp:t></hp:run></hp:p></hp:subList></hp:tc>`;
}

/** 행 배열(각 행은 문자열 배열)을 하나의 표 XML 로 만든다. */
function table(rows) {
  const trs = rows
    .map((cols, r) => `<hp:tr>${cols.map((text, c) => cell(r, c, text)).join("")}</hp:tr>`)
    .join("");
  return `<hp:tbl>${trs}</hp:tbl>`;
}

/** 표들을 담은 최소 HWPX 버퍼를 만든다. */
function makeHwpx(tables) {
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?><hs:sec xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" ` +
    `xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section">${tables.join("")}</hs:sec>`;
  const zip = new AdmZip();
  zip.addFile("Contents/section0.xml", Buffer.from(xml, "utf-8"));
  return zip.toBuffer();
}

function byLabel(schema, label) {
  return schema.fields.find((f) => f.label === label);
}

test("표에서 라벨-지시문 쌍을 칸으로 뽑아낸다", () => {
  const buf = makeHwpx([
    table([
      ["제품‧서비스개요", "※ 제품(서비스)의 사용 용도와 사양, 가격을 구체적으로 기재"],
      ["사업화 전략", "※ 목표시장 규모와 진입 전략을 구체적으로 기재"],
    ]),
  ]);
  const schema = parseHwpxFormSchema(buf, "사업계획서.hwpx");

  assert.equal(schema.fields.length, 2);
  assert.equal(schema.fields[0].label, "제품‧서비스개요");
  assert.equal(schema.fields[0].type, "NARRATIVE");
  assert.match(schema.fields[0].guidance, /사용 용도와 사양/);
});

test("개인정보 칸은 PERSONAL 로 분류되고 AI 전송에서 제외된다", () => {
  const buf = makeHwpx([
    table([
      ["이메일", ""],
      ["연락처(휴대폰)", ""],
      ["생년월일", ""],
    ]),
  ]);
  const schema = parseHwpxFormSchema(buf, "신청서.hwpx");

  for (const label of ["이메일", "연락처(휴대폰)", "생년월일"]) {
    const field = byLabel(schema, label);
    assert.ok(field, `${label} 칸을 못 찾음`);
    assert.equal(field.type, "PERSONAL", `${label} 가 PERSONAL 이 아님`);
    assert.equal(isAiSafeField(field.type), false, `${label} 가 AI 전송에서 안 걸러짐`);
  }
});

test("'대표자' 가 들어간 긴 서술형 라벨은 개인정보로 오분류되지 않는다", () => {
  // 실측 회귀: 이 칸이 PERSONAL 로 잡혀 서술형 8칸 중 1칸이 사라졌었다.
  const buf = makeHwpx([
    table([
      ["제품(서비스) 및 대표자소개", "※ 제품과 대표자의 역량을 함께 기재하십시오"],
    ]),
  ]);
  const schema = parseHwpxFormSchema(buf, "사업계획서.hwpx");
  const field = byLabel(schema, "제품(서비스) 및 대표자소개");

  assert.ok(field, "칸 자체가 사라짐");
  assert.equal(field.type, "NARRATIVE");
  assert.equal(isAiSafeField(field.type), true);
});

test("표 머리글·연도 표기는 입력 칸으로 잡지 않는다", () => {
  // 실측 회귀: 매출 현황표의 열 머리글이 라벨 자리로 들어와 20칸 중 7칸이 쓰레기였다.
  const buf = makeHwpx([
    table([
      ["’25년", ""],
      ["’24년", ""],
      ["신청일 현재", ""],
      ["...", ""],
      ["구분", ""],
      ["제품‧서비스개요", "※ 제품의 사용 용도와 사양을 구체적으로 기재"],
    ]),
  ]);
  const schema = parseHwpxFormSchema(buf, "사업계획서.hwpx");
  const labels = schema.fields.map((f) => f.label);

  for (const junk of ["’25년", "’24년", "신청일 현재", "...", "구분"]) {
    assert.ok(!labels.includes(junk), `비필드가 칸으로 잡힘: ${junk}`);
  }
  assert.ok(labels.includes("제품‧서비스개요"), "정상 칸까지 걸러짐");
});

test("날짜·번호 칸은 지시문이 붙어 있어도 사실정보로 본다", () => {
  // 실측 회귀: 지시문 길이만 보고 NARRATIVE 로 잡아 날짜 칸에 문단을 요구했다.
  const buf = makeHwpx([
    table([
      ["개업연월일(회사성립연월일)", "※ 개인:개업연월일, 법인:회사성립연월일"],
      ["사업자등록번호", ""],
    ]),
  ]);
  const schema = parseHwpxFormSchema(buf, "사업계획서.hwpx");

  assert.equal(byLabel(schema, "개업연월일(회사성립연월일)").type, "FACT");
  assert.equal(byLabel(schema, "사업자등록번호").type, "FACT");
});

test("첨부물 칸은 ATTACHMENT 로 분류된다", () => {
  const buf = makeHwpx([
    table([["이미지", "※ 아이템의 특징을 나타낼 수 있는 참고사진(이미지)·설계도 등 삽입"]]),
  ]);
  const schema = parseHwpxFormSchema(buf, "사업계획서.hwpx");
  assert.equal(byLabel(schema, "이미지").type, "ATTACHMENT");
});

test("HWPX 가 아닌 버퍼는 예외 없이 경고와 함께 빈 결과를 돌려준다", () => {
  // 구버전 바이너리 HWP(OLE2/CFB)를 넣어도 던지지 않아야 한다.
  const notZip = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x00]);
  const schema = parseHwpxFormSchema(notZip, "구버전.hwp");

  assert.equal(schema.fields.length, 0);
  assert.ok(schema.warnings.length > 0, "경고가 없음");
});
