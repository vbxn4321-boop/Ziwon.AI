const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const {
  validateUploadedDocument,
} = require("../../src/lib/parser/upload-validator.ts");
const { maskPersonalInfo } = require("../../src/lib/parser/notice-extractor.ts");

const routeSource = fs.readFileSync(
  path.join(__dirname, "../../src/app/api/ai/import-plan/route.ts"),
  "utf8"
);
const compiled = ts.transpileModule(routeSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  },
}).outputText;

function loadRoute({ userAuth = { ok: true, user: { sub: "user-123" } }, extractText = "추출된 텍스트" } = {}) {
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    console: { error() {}, warn() {}, log() {} },
    Buffer,
    File,
    FormData,
    require(name) {
      if (name === "next/server") {
        return {
          NextResponse: {
            json: (body, options = {}) => ({
              json: async () => body,
              status: options.status || 200,
            }),
          },
        };
      }
      if (name === "@/lib/auth/verify-token") {
        return { requireUser: async () => userAuth };
      }
      if (name === "@/lib/parser/upload-validator") {
        return { validateUploadedDocument, MAX_UPLOAD_BYTES: 15 * 1024 * 1024 };
      }
      if (name === "@/lib/parser/notice-extractor") {
        return { maskPersonalInfo };
      }
      if (name === "@/lib/parser/document-parser") {
        return { extractTextFromBuffer: async () => extractText };
      }
      throw new Error("Unexpected dependency: " + name);
    },
  });
  return exports;
}

test("import-plan route: 비로그인 요청은 401 반환", async () => {
  const route = loadRoute({ userAuth: { ok: false, reason: "로그인이 필요합니다." } });
  const req = {
    formData: async () => new FormData(),
  };

  const res = await route.POST(req);
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.success, false);
});

test("import-plan route: 파일 누락 시 400 반환", async () => {
  const route = loadRoute();
  const formData = new FormData();
  const req = {
    formData: async () => formData,
  };

  const res = await route.POST(req);
  assert.equal(res.status, 400);
});

test("import-plan route: 위조되었거나 미지원 파일은 415 반환", async () => {
  const route = loadRoute();
  const formData = new FormData();
  const fakeFile = new File([Buffer.from("This is plain text pretending to be PDF")], "fake.pdf", {
    type: "application/pdf",
  });
  formData.append("file", fakeFile);
  const req = {
    formData: async () => formData,
  };

  const res = await route.POST(req);
  assert.equal(res.status, 415);
});

test("import-plan route: 정상 텍스트 업로드 시 개인정보 마스킹 및 메타데이터 반환", async () => {
  const rawContent =
    "사업계획서 본문입니다.\n대표자 홍길동 전화 010-9876-5432 이메일 ceo@company.kr\n목표 시장 분석";
  const route = loadRoute({ extractText: rawContent });
  const formData = new FormData();
  const file = new File([Buffer.from(rawContent)], "valid_plan.txt", { type: "text/plain" });
  formData.append("file", file);
  const req = {
    formData: async () => formData,
  };

  const res = await route.POST(req);
  assert.equal(res.status, 200);
  const body = await res.json();

  assert.equal(body.success, true);
  assert.equal(body.fileName, "valid_plan.txt");
  assert.equal(body.docType, "TXT");
  assert.equal(body.truncated, false);
  assert.ok(body.originalCharacters > 0);
  assert.ok(!body.text.includes("010-9876-5432"));
  assert.ok(!body.text.includes("ceo@company.kr"));
});
