const test = require("node:test");
const assert = require("node:assert/strict");
const AdmZip = require("adm-zip");
const CFB = require("cfb");

const {
  validateUploadedDocument,
  hasPdfMagic,
  hasOleCfbMagic,
  hasZipMagic,
  MAX_UPLOAD_BYTES,
} = require("../../src/lib/parser/upload-validator.ts");

test("Upload Validator: 15MB 초과 파일 거부 (413)", () => {
  const hugeBuf = Buffer.alloc(MAX_UPLOAD_BYTES + 1024, 0);
  const res = validateUploadedDocument(hugeBuf, "large_plan.pdf");
  assert.equal(res.valid, false);
  assert.equal(res.statusCode, 413);
  assert.match(res.error, /15MB/);
});

test("Upload Validator: 미지원 확장자 및 빈 파일 거부 (400/415)", () => {
  const emptyRes = validateUploadedDocument(Buffer.alloc(0), "empty.pdf");
  assert.equal(emptyRes.valid, false);
  assert.equal(emptyRes.statusCode, 400);

  const exeRes = validateUploadedDocument(Buffer.from("MZ..."), "malicious.exe");
  assert.equal(exeRes.valid, false);
  assert.equal(exeRes.statusCode, 415);
});

test("Upload Validator: 확장자 위조 거부 (가짜 PDF/HWP/HWPX)", () => {
  // Plain text buffer pretending to be a PDF
  const fakePdf = Buffer.from("Hello world this is not a PDF");
  const pdfRes = validateUploadedDocument(fakePdf, "plan.pdf");
  assert.equal(pdfRes.valid, false);
  assert.equal(pdfRes.statusCode, 415);
  assert.match(pdfRes.error, /PDF/);

  // Fake HWP
  const fakeHwp = Buffer.from("Not an OLE compound document");
  const hwpRes = validateUploadedDocument(fakeHwp, "plan.hwp");
  assert.equal(hwpRes.valid, false);
  assert.equal(hwpRes.statusCode, 415);
  assert.match(hwpRes.error, /HWP/);

  // Fake HWPX (not a zip)
  const fakeHwpx = Buffer.from("Not a ZIP file");
  const hwpxRes = validateUploadedDocument(fakeHwpx, "plan.hwpx");
  assert.equal(hwpxRes.valid, false);
  assert.equal(hwpxRes.statusCode, 415);
});

test("Upload Validator: 정상 PDF 판별", () => {
  const pdfBuf = Buffer.from("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj");
  const res = validateUploadedDocument(pdfBuf, "business_plan.pdf");
  assert.equal(res.valid, true);
  if (res.valid) {
    assert.equal(res.docType, "PDF");
    assert.equal(res.fileName, "business_plan.pdf");
  }
});

test("Upload Validator: 정상 HWP 5.0 판별", () => {
  const cfb = CFB.utils.cfb_new();
  const headerBuf = Buffer.alloc(256, 0);
  headerBuf.write("HWP Document File", 0, "latin1");
  CFB.utils.cfb_add(cfb, "/FileHeader", headerBuf);
  const hwpBuf = Buffer.from(CFB.write(cfb, { type: "buffer" }));

  const res = validateUploadedDocument(hwpBuf, "original_plan.hwp");
  assert.equal(res.valid, true);
  if (res.valid) {
    assert.equal(res.docType, "HWP");
  }
});

test("Upload Validator: 정상 HWPX / DOCX 판별", () => {
  // 1. HWPX (ZIP with Contents/section0.xml)
  const hwpxZip = new AdmZip();
  hwpxZip.addFile("Contents/section0.xml", Buffer.from("<hp:p><hp:t>Test</hp:t></hp:p>"));
  const hwpxBuf = hwpxZip.toBuffer();

  const hwpxRes = validateUploadedDocument(hwpxBuf, "standard_plan.hwpx");
  assert.equal(hwpxRes.valid, true);
  if (hwpxRes.valid) {
    assert.equal(hwpxRes.docType, "HWPX");
  }

  // 2. DOCX (ZIP with word/document.xml)
  const docxZip = new AdmZip();
  docxZip.addFile("word/document.xml", Buffer.from("<w:p><w:t>Word Content</w:t></w:p>"));
  const docxBuf = docxZip.toBuffer();

  const docxRes = validateUploadedDocument(docxBuf, "plan.docx");
  assert.equal(docxRes.valid, true);
  if (docxRes.valid) {
    assert.equal(docxRes.docType, "DOCX");
  }
});

test("Upload Validator: 일반 ZIP 거부 (단일 문서 전용)", () => {
  const genericZip = new AdmZip();
  genericZip.addFile("some_photo.png", Buffer.from("PNG..."));
  genericZip.addFile("data.csv", Buffer.from("a,b,c"));
  const zipBuf = genericZip.toBuffer();

  const res = validateUploadedDocument(zipBuf, "archive.hwpx");
  assert.equal(res.valid, false);
  assert.equal(res.statusCode, 415);
  assert.match(res.error, /HWPX/);
});

test("Upload Validator: ZIP 엔트리 500개 초과 거부 (413)", () => {
  const bombZip = new AdmZip();
  for (let i = 0; i < 505; i++) {
    bombZip.addFile(`entry_${i}.txt`, Buffer.from("small text"));
  }
  const zipBuf = bombZip.toBuffer();

  const res = validateUploadedDocument(zipBuf, "bomb.hwpx");
  assert.equal(res.valid, false);
  assert.equal(res.statusCode, 413);
  assert.match(res.error, /엔트리/);
});

test("Upload Validator: 바이너리 TXT 거부 (415)", () => {
  // Binary buffer with null bytes pretending to be .txt
  const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe, 0x80, 0x00, 0x12]);
  const res = validateUploadedDocument(binaryData, "notes.txt");
  assert.equal(res.valid, false);
  assert.equal(res.statusCode, 415);
  assert.match(res.error, /바이너리/);

  // Normal UTF-8 TXT
  const validTxt = Buffer.from("창업 사업계획서 텍스트 본문입니다.\n목표 시장 분석...");
  const txtRes = validateUploadedDocument(validTxt, "notes.txt");
  assert.equal(txtRes.valid, true);
  if (txtRes.valid) {
    assert.equal(txtRes.docType, "TXT");
  }
});

test("Upload Validator: word/document.xml 없는 XLSX/PPTX 위장 DOCX 거부 (415)", () => {
  const xlsxZip = new AdmZip();
  xlsxZip.addFile("[Content_Types].xml", Buffer.from("<Types></Types>"));
  xlsxZip.addFile("xl/workbook.xml", Buffer.from("<workbook></workbook>"));
  const xlsxBuf = xlsxZip.toBuffer();

  const res = validateUploadedDocument(xlsxBuf, "fake_document.docx");
  assert.equal(res.valid, false);
  assert.equal(res.statusCode, 415);
  assert.match(res.error, /비지원 Office 문서|DOCX 문서 내부 구조/);
});

test("Upload Validator: HWP Document File 서명 없는 일반 OLE 파일 거부 (415)", () => {
  const cfb = CFB.utils.cfb_new();
  const dummyStream = Buffer.from("Generic OLE Stream Data");
  CFB.utils.cfb_add(cfb, "/Workbook", dummyStream);
  const oleBuf = Buffer.from(CFB.write(cfb, { type: "buffer" }));

  const res = validateUploadedDocument(oleBuf, "not_a_hwp.hwp");
  assert.equal(res.valid, false);
  assert.equal(res.statusCode, 415);
  assert.match(res.error, /HWP Document File 서명 누락/);
});

test("Upload Validator: word/document-fake.xml 등 유사 경로 위장 DOCX 거부 (415)", () => {
  const zip = new AdmZip();
  zip.addFile("word/document-fake.xml", Buffer.from("<xml>fake</xml>"));
  const buf = zip.toBuffer();

  const res = validateUploadedDocument(buf, "fake_prefix.docx");
  assert.equal(res.valid, false);
  assert.equal(res.statusCode, 415);
  assert.match(res.error, /비지원 Office 문서|DOCX 문서 내부 구조/);
});

test("Upload Validator: contents/random.txt 등 무관한 경로의 위장 HWPX 거부 (415)", () => {
  const zip = new AdmZip();
  zip.addFile("contents/random.txt", Buffer.from("fake hwpx"));
  const buf = zip.toBuffer();

  const res = validateUploadedDocument(buf, "fake_hwpx.hwpx");
  assert.equal(res.valid, false);
  assert.equal(res.statusCode, 415);
  assert.match(res.error, /비지원 Office 문서|HWPX 문서 내부 구조/);
});

