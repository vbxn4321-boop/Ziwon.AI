const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { z } = require("zod");

const routeSource = fs.readFileSync(
  path.join(__dirname, "../../src/app/api/ai/import-plan/map/route.ts"),
  "utf8"
);
const compiled = ts.transpileModule(routeSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  },
}).outputText;

function loadRoute({ userAuth = { ok: true, user: { sub: "user-123" } }, guardBlocked = null } = {}) {
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    console: { error() {}, warn() {}, log() {} },
    process: { env: { GEMINI_API_KEY: "mock-key" } },
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
      if (name === "zod") return { z };
      if (name === "@/lib/auth/verify-token") return { requireUser: async () => userAuth };
      if (name === "@/lib/security/ai-route-guard") return { guardAiRoute: async () => guardBlocked, LIGHT_LIMITS: {} };
      if (name === "@/lib/ai/models") return { FAST_MODELS: ["gemini-3.7-flash"] };
      if (name === "@google/genai") {
        return {
          GoogleGenAI: class {
            constructor() {
              this.models = {
                generateContent: async () => ({
                  text: JSON.stringify({
                    itemName: "테스트 아이템",
                    problemBackground: "테스트 배경",
                  }),
                }),
              };
            }
          },
        };
      }
      throw new Error("Unexpected dependency: " + name);
    },
  });
  return exports;
}

test("import-plan-map route: 비로그인 요청은 401 반환", async () => {
  const route = loadRoute({ userAuth: { ok: false, reason: "로그인이 필요합니다." } });
  const req = {
    json: async () => ({ text: "단순 사업계획서 텍스트 20자 이상입니다." }),
  };

  const res = await route.POST(req);
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.success, false);
});

test("import-plan-map route: 20자 미만 짧은 텍스트는 400 반환", async () => {
  const route = loadRoute();
  const req = {
    json: async () => ({ text: "짧음" }),
  };

  const res = await route.POST(req);
  assert.equal(res.status, 400);
});

test("import-plan-map route: 정상 매핑 및 Zod 스키마 검증", async () => {
  const route = loadRoute();
  const req = {
    json: async () => ({
      text: "본 사업은 인공지능 기반 공공 지원사업 맞춤 매칭 서비스로서 기존 지원사업 탐색의 번거로움을 해결하고자 합니다.",
    }),
  };

  const res = await route.POST(req);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.mappedPlan?.itemName, "테스트 아이템");
  assert.equal(body.mappedPlan?.problemBackground, "테스트 배경");
  assert.equal(body.mappedPlan?.solutionOverview, "");
});
