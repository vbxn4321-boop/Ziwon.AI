/**
 * notice-extractor.ts 회귀 테스트.
 *
 * 이 파일은 최근 변경이 가장 잦은 파서 중 하나인데 자동 테스트가 없어서,
 * 매번 임시 스크립트로 운영 DB를 조회해 눈으로 확인해 왔다. 여기서 고정한
 * 케이스들은 전부 실제로 한 번씩 터졌던 것들이다:
 *
 *  - 개인정보 마스킹: 담당자 연락처가 Gemini 프롬프트로 새던 문제
 *  - 날짜·사업자번호·금액 오탐: 마스킹이 정상 본문을 훼손하던 문제
 *  - 문서 분류: "법률" 키워드가 법률지원사업 공고를 통째로 제외시키던 문제
 *  - 문서 분류: "사업계획" 키워드가 빈 서식을 공고문으로 잘못 잡던 문제
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

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

const { maskPersonalInfo, classifyDocument, isBinaryGarbage, extractNoticeForPrompt } = loadModule(
  "../../src/lib/parser/notice-extractor.ts"
);

test("개인정보는 Gemini 전송 전에 가려진다", () => {
  const cases = [
    ["신청 문의: hong@abc.or.kr 로 보내주세요", "[이메일]"],
    ["문의 042-000-0000", "[연락처]"],
    ["연락처 02-1234-5678", "[연락처]"],
    ["담당 010-1234-5678", "[연락처]"],
    ["01012345678 로 연락", "[연락처]"],
    ["주민등록번호 900101-1234567", "[주민등록번호]"],
  ];
  for (const [input, expectedMarker] of cases) {
    const { text, maskedCount } = maskPersonalInfo(input);
    assert.ok(maskedCount > 0, `마스킹되지 않음: ${input}`);
    assert.ok(text.includes(expectedMarker), `${expectedMarker} 가 없음: ${text}`);
  }
});

test("문의 맥락에 붙은 담당자 실명도 가린다", () => {
  assert.match(maskPersonalInfo("담당자: 홍길동 주무관").text, /담당자: ○○○ 주무관/);
  assert.match(maskPersonalInfo("문의처 김철수 팀장").text, /문의처 ○○○ 팀장/);
});

test("마스킹이 공고 본문의 정상 정보를 훼손하지 않는다", () => {
  // 전부 한 번씩 오탐으로 지워질 뻔했던 패턴이다.
  const mustSurvive = [
    "접수기간: 2026-09-16 ~ 2026-10-15",
    "사업자등록번호 123-45-67890",
    "사업자등록번호 012-34-56789",
    "지원금액 최대 100,000,000원 (총 1,000백만원)",
    "기술성 40점, 시장성 30점, 사업성 30점",
    "중소기업기본법 제2조 제1항",
    "공고 제2026-0123호",
  ];
  for (const input of mustSurvive) {
    const { text, maskedCount } = maskPersonalInfo(input);
    assert.equal(maskedCount, 0, `오탐 발생: ${input} -> ${text}`);
    assert.equal(text, input);
  }
});

test("문서 분류: 법률 지원사업 공고가 규정집으로 오분류되지 않는다", () => {
  // "법률" 키워드만 보고 제외하던 탓에 법률지원사업·법률상담회 공고가 통째로
  // 빠지던 문제. 지금은 "법률 제12345호" 형태만 규정으로 본다.
  const kind = classifyDocument(
    "2026년 소상공인 법률지원사업 공고.hwp",
    "본 사업은 소상공인의 법률 분쟁 해결을 지원합니다. 신청기간은 2026년 3월입니다. " +
      "지원대상은 중소기업이며 선정절차는 서류평가 후 발표평가로 진행합니다.".repeat(4)
  );
  assert.notEqual(kind, "REGULATION");
});

test("문서 분류: 빈 사업계획서 서식이 공고문으로 잡히지 않는다", () => {
  const kind = classifyDocument(
    "붙임1. 사업계획서 서식.hwpx",
    "창업아이템 개요 □ 투자유치 l □ 파트너 발굴 ※ 아래 항목을 작성하여 제출하십시오 " +
      "※ 분량은 5page 내외로 작성 ※ 표의 목차를 변경하지 마십시오".repeat(4)
  );
  assert.equal(kind, "FORM");
});

test("바이너리 쓰레기 텍스트를 걸러낸다", () => {
  // 파일 시그니처가 그대로 남은 경우 — 가장 확실한 신호라 길이와 무관하게 잡는다.
  assert.equal(isBinaryGarbage("%PDF-1.4 ..."), true);
  assert.equal(isBinaryGarbage("PK\x03\x04 ..."), true);

  // 시그니처가 없는 경우의 판정 조건은 세 가지가 모두 걸려야 한다:
  // 200자 이상 + 한글 비율 5% 이하 + 제어문자 2% 초과.
  // (실제 HWP 추출 실패 시 나오는 형태를 재현한다)
  const mojibake = "捤獥汤捯湰灧氠瑢\x01\x02\x03\x04".repeat(20);
  assert.ok(mojibake.length >= 200);
  assert.equal(isBinaryGarbage(mojibake), true);

  // 한글이 충분하면 제어문자가 섞여 있어도 본문으로 본다.
  const normal = (
    "(재)대구디지털혁신진흥원에서 지역의 초기 단계 게임기업의 추가 성장 및 확장 발판 마련을 위해 " +
    "추진하는 사업의 참가기업 모집을 다음과 같이 공고하오니 관심 있는 기업들의 많은 참여 바랍니다. "
  ).repeat(3);
  assert.ok(normal.length >= 200);
  assert.equal(isBinaryGarbage(normal), false);

  // 짧은 텍스트는 판단 근거가 부족하므로 본문으로 남긴다 (과잉 차단 방지).
  assert.equal(isBinaryGarbage("짧은 안내문"), false);
});

test("extractNoticeForPrompt 결과에는 개인정보가 남지 않는다", () => {
  const { promptText } = extractNoticeForPrompt(
    [
      {
        fileName: "2026년 지원사업 공고문.hwp",
        extractedText:
          "□ 사업개요\n본 사업은 중소기업의 기술개발을 지원합니다. 지원규모는 최대 1억원입니다.\n" +
          "□ 신청방법\n온라인 접수로만 진행합니다. 접수기간은 2026-03-01 ~ 2026-03-31 입니다.\n" +
          "□ 문의처\n담당자: 홍길동 주무관 (042-000-0000, hong@abc.or.kr)\n".repeat(3),
      },
    ],
    8000
  );

  assert.ok(promptText.length > 0, "발췌 결과가 비어 있음");
  assert.doesNotMatch(promptText, /[\w.+-]+@[\w-]+\.[\w.-]+/, "이메일이 남아 있음");
  assert.doesNotMatch(promptText, /\b0\d{1,2}[-.)\s]\s?\d{3,4}[-.\s]\d{4}\b/, "전화번호가 남아 있음");
});
