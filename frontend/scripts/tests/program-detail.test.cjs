const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Exercise the real route with isolated DB/scraper doubles; never contact live services.
const source = fs.readFileSync(path.join(__dirname, "../../src/app/api/support-programs/[id]/route.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText;

function loadRoute(results) {
  const queries = [], scraped = [];
  let parserLoads = 0;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, performance, console: { error() {} },
    require(name) {
      if (name === "next/server") return { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200, headers: options.headers }) } };
      if (name === "@/lib/db") return { prisma: { supportProgram: { async findUnique(query) {
        queries.push(query);
        const value = results.shift();
        if (value instanceof Error) throw value;
        return value;
      } } } };
      if (name === "@/lib/parser/attachment-scraper") {
        parserLoads++;
        return { scrapeMissingAttachments: async (...args) => scraped.push(args) };
      }
      throw new Error("Unexpected dependency: " + name);
    },
  });
  return { route: exports, queries, scraped, parserLoads: () => parserLoads };
}
const context = () => ({ params: Promise.resolve({ id: "program-1" }) });
const request = query => ({ nextUrl: new URL("http://localhost/api/support-programs/program-1" + query) });

test("summary excludes raw source payload, documents and analyses without loading parsers", async () => {
  const mock = loadRoute([{ id: "program-1", sources: [] }]);
  const response = await mock.route.GET(request("?view=summary"), context());
  assert.equal(response.status, 200);
  const include = mock.queries[0].include;
  assert.equal(include.documents, undefined);
  assert.equal(include.analyses, undefined);
  assert.equal(include.sources.select.rawData, undefined);
  assert.equal(include.sources.select.sourceUrl, true);
  assert.equal(mock.parserLoads(), 0);
  assert.match(response.headers["Server-Timing"], /^db;dur=/);
});

test("ordinary detail reads saved documents and latest analysis, never crawls even with refresh=true", async () => {
  const mock = loadRoute([{ id: "program-1", documents: [], sources: [{ sourceUrl: "https://example.com" }] }]);
  const response = await mock.route.GET(request("?refresh=true"), context());
  assert.equal(response.status, 200);
  assert.equal(mock.queries[0].include.documents, true); // No chunks relation.
  assert.equal(mock.queries[0].include.analyses.take, 1);
  assert.equal(mock.parserLoads(), 0);
});

test("missing summary or detail returns 404", async () => {
  for (const query of ["?view=summary", ""]) {
    const mock = loadRoute([null]);
    assert.equal((await mock.route.GET(request(query), context())).status, 404);
    assert.equal(mock.parserLoads(), 0);
  }
});

test("database errors return 500 rather than empty success", async () => {
  const mock = loadRoute([new Error("DB unavailable")]);
  assert.equal((await mock.route.GET(request(""), context())).status, 500);
});

test("explicit POST synchronizes then returns refreshed data", async () => {
  const updated = { id: "program-1", documents: [{ id: "document-1" }] };
  const mock = loadRoute([{ id: "program-1", sources: [{ sourceUrl: "https://example.com/notice" }] }, updated]);
  const response = await mock.route.POST(request(""), context());
  assert.equal(response.status, 200);
  assert.equal(response.body.data, updated);
  assert.deepEqual(mock.scraped, [["program-1", "https://example.com/notice"]]);
  assert.equal(mock.queries.length, 2);
});

test("POST cannot synchronize a missing program or one without a source", async () => {
  for (const [program, status] of [[null, 404], [{ id: "program-1", sources: [] }, 422]]) {
    const mock = loadRoute([program]);
    assert.equal((await mock.route.POST(request(""), context())).status, status);
    assert.equal(mock.parserLoads(), 0);
  }
});
