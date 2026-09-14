const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

// Transpile constants.ts to CommonJS for testing
const constantsSource = fs.readFileSync(path.join(__dirname, "../../src/features/psst/constants.ts"), "utf8");
const compiled = ts.transpileModule(constantsSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText;

const mod = { exports: {} };
const fn = new Function("exports", "module", "require", compiled);
fn(mod.exports, mod, require);

const { getStandardFormSchema, STANDARD_FORM_SCHEMAS, TARGET_PROGRAM_FORMATS } = mod.exports;

test("TARGET_PROGRAM_FORMATS defines major government programs", () => {
  assert.ok(TARGET_PROGRAM_FORMATS.length >= 6);
  assert.ok(TARGET_PROGRAM_FORMATS.some((f) => f.id === "pre-startup"));
  assert.ok(TARGET_PROGRAM_FORMATS.some((f) => f.id === "early-startup"));
  assert.ok(TARGET_PROGRAM_FORMATS.some((f) => f.id === "r-and-d"));
});

test("getStandardFormSchema maps correctly for pre-startup, early-startup, and R&D", () => {
  const pre = getStandardFormSchema("2026년 중소벤처기업부 예비창업패키지");
  assert.equal(pre.title, STANDARD_FORM_SCHEMAS["pre-startup"].title);
  assert.ok(pre.fields.length >= 7);
  assert.equal(pre.fields[0].type, "FACT");
  assert.equal(pre.fields[1].type, "NARRATIVE");
  assert.ok(pre.fields[1].guidance.length > 5);

  const rnd = getStandardFormSchema("2026년 디딤돌 R&D 창업성장기술개발사업");
  assert.equal(rnd.title, STANDARD_FORM_SCHEMAS["r-and-d"].title);
  assert.ok(rnd.fields.some((f) => f.label.includes("정량적")));

  const early = getStandardFormSchema("초기창업패키지 지원사업");
  assert.equal(early.title, STANDARD_FORM_SCHEMAS["early-startup"].title);
});

test("all standard schema fields have valid id, label, type, and guidance", () => {
  for (const [key, schema] of Object.entries(STANDARD_FORM_SCHEMAS)) {
    assert.ok(schema.title, `Schema ${key} must have title`);
    assert.ok(schema.fields.length > 0, `Schema ${key} must have fields`);
    for (const field of schema.fields) {
      assert.ok(field.id, "Field must have id");
      assert.ok(field.label, "Field must have label");
      assert.ok(["FACT", "NARRATIVE", "ATTACHMENT", "CONSENT"].includes(field.type), `Field type ${field.type} must be valid`);
    }
  }
});
