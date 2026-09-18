const test = require("node:test");
const assert = require("node:assert/strict");
const zlib = require("node:zlib");
const CFB = require("cfb");

// Import the parser functions from TypeScript source via tsx or transpiled module
const {
  parseHwpWithDetails,
  extractTextFromHWP,
  readHwpFileFlags,
} = require("../../src/lib/parser/document-parser.ts");

/**
 * Helper to build a synthetic HWP 5.0 CFB file with custom FileHeader and BodyText Sections.
 */
function createSyntheticHwp({
  headerFlags = 0x01, // bit 0 = compressed
  validSignature = true,
  sections = [],
  uncompressed = false,
}) {
  const cfb = CFB.utils.cfb_new();

  // 1. FileHeader stream (256 bytes)
  const headerBuf = Buffer.alloc(256, 0);
  if (validSignature) {
    headerBuf.write("HWP Document File", 0, "latin1");
  } else {
    headerBuf.write("INVALID SIGNATURE", 0, "latin1");
  }
  headerBuf.writeUInt32LE(headerFlags, 36);
  CFB.utils.cfb_add(cfb, "/FileHeader", headerBuf);

  // 2. Sections
  for (let idx = 0; idx < sections.length; idx++) {
    const sectionData = sections[idx]; // uncompressed buffer of records
    const finalData = uncompressed ? sectionData : zlib.deflateRawSync(sectionData);
    CFB.utils.cfb_add(cfb, `/BodyText/Section${idx}`, finalData);
  }

  return Buffer.from(CFB.write(cfb, { type: "buffer" }));
}

/**
 * Helper to create HWPTAG_PARA_TEXT record (Tag 67)
 */
function createParaTextRecord(textCodes) {
  // textCodes is an array of 16-bit uints or buffers
  const buf = Buffer.alloc(textCodes.length * 2);
  for (let i = 0; i < textCodes.length; i++) {
    buf.writeUInt16LE(textCodes[i], i * 2);
  }

  // Record header: tagId (10 bits) | level (10 bits) | size (12 bits)
  // tagId = 67 (0x43), level = 0
  const tagId = 67;
  const size = buf.length;

  let headerBuf;
  if (size < 0xfff) {
    const headerVal = (size << 20) | tagId;
    headerBuf = Buffer.alloc(4);
    headerBuf.writeUInt32LE(headerVal, 0);
    return Buffer.concat([headerBuf, buf]);
  } else {
    // Extended size record
    const headerVal = (((0xfff << 20) | tagId) >>> 0);
    headerBuf = Buffer.alloc(8);
    headerBuf.writeUInt32LE(headerVal, 0);
    headerBuf.writeUInt32LE(size, 4);
    return Buffer.concat([headerBuf, buf]);
  }
}

test("HWP 5.0: FileHeader 암호화(bit 1) 플래그 감지 시 즉시 파싱 중단", () => {
  const hwpBuf = createSyntheticHwp({
    headerFlags: 0x02 | 0x01, // encrypted + compressed
    sections: [createParaTextRecord(["A".charCodeAt(0)])],
  });

  const res = parseHwpWithDetails(hwpBuf);
  assert.equal(res.status, "ENCRYPTED");
  assert.equal(res.encrypted, true);
  assert.equal(res.text, "");
  assert.equal(extractTextFromHWP(hwpBuf), "");
});

test("HWP 5.0: FileHeader 배포용 DRM(bit 2) 플래그 감지 시 즉시 파싱 중단", () => {
  const hwpBuf = createSyntheticHwp({
    headerFlags: 0x04 | 0x01, // distribution + compressed
    sections: [createParaTextRecord(["A".charCodeAt(0)])],
  });

  const res = parseHwpWithDetails(hwpBuf);
  assert.equal(res.status, "DISTRIBUTION");
  assert.equal(res.distribution, true);
  assert.equal(res.text, "");
});

test("HWP 5.0: 비압축 문서(bit 0 = 0) 직접 파싱", () => {
  // Prepare Korean text: "테스트 사업계획서"
  const korean = "테스트 사업계획서";
  const codes = [];
  for (let i = 0; i < korean.length; i++) {
    codes.push(korean.charCodeAt(i));
  }

  const sectionBuf = createParaTextRecord(codes);
  const hwpBuf = createSyntheticHwp({
    headerFlags: 0x00, // uncompressed
    sections: [sectionBuf],
    uncompressed: true,
  });

  const res = parseHwpWithDetails(hwpBuf);
  assert.equal(res.status, "PARSED");
  assert.equal(res.compressed, false);
  assert.equal(res.text, "테스트 사업계획서");
});

test("HWP 5.0: 제어문자 14바이트 skip 및 문자 컨트롤 24(-), 30/31(공백) 보존", () => {
  // Construct text codes containing:
  // 1. "사업" (0xc0ac, 0xc5c5)
  // 2. Control code 24 (Hyphen)
  // 3. Control code 4 (Inline control, should skip 7 WCHARs = 14 bytes)
  //    followed by 7 dummy property WCHARs
  // 4. "계획"
  // 5. Control code 9 (Tab -> "  ", should also skip 7 WCHARs)
  //    followed by 7 dummy property WCHARs
  // 6. Control code 30 (Non-breaking space -> " ")
  // 7. "서"
  const codes = [
    "사".charCodeAt(0),
    "업".charCodeAt(0),
    24, // Hyphen -> "-"
    4, // Inline control: skips next 7 WCHARs
    0x1111, 0x2222, 0x3333, 0x4444, 0x5555, 0x6666, 0x7777, // 7 dummy property words
    "계".charCodeAt(0),
    "획".charCodeAt(0),
    9, // Tab -> "  " + skips next 7 WCHARs
    0x8888, 0x9999, 0xaaaa, 0xbbbb, 0xcccc, 0xdddd, 0xeeee, // 7 dummy property words
    30, // Space -> " "
    "서".charCodeAt(0),
  ];

  const sectionBuf = createParaTextRecord(codes);
  const hwpBuf = createSyntheticHwp({
    headerFlags: 0x01,
    sections: [sectionBuf],
  });

  const res = parseHwpWithDetails(hwpBuf);
  assert.equal(res.status, "PARSED");
  // Expected: "사업-계획   서" (Tab = 2 spaces + code 30 = 1 space)
  assert.equal(res.text, "사업-계획   서");
});

test("HWP 5.0: 다중 Section 정렬 (Section0, Section1, Section10)", () => {
  const cfb = CFB.utils.cfb_new();

  const headerBuf = Buffer.alloc(256, 0);
  headerBuf.write("HWP Document File", 0, "latin1");
  headerBuf.writeUInt32LE(0x01, 36);
  CFB.utils.cfb_add(cfb, "/FileHeader", headerBuf);

  // Add out-of-order sections
  const sec10 = zlib.deflateRawSync(createParaTextRecord(["3".charCodeAt(0)]));
  const sec1 = zlib.deflateRawSync(createParaTextRecord(["2".charCodeAt(0)]));
  const sec0 = zlib.deflateRawSync(createParaTextRecord(["1".charCodeAt(0)]));

  CFB.utils.cfb_add(cfb, "/BodyText/Section10", sec10);
  CFB.utils.cfb_add(cfb, "/BodyText/Section1", sec1);
  CFB.utils.cfb_add(cfb, "/BodyText/Section0", sec0);

  const hwpBuf = Buffer.from(CFB.write(cfb, { type: "buffer" }));
  const res = parseHwpWithDetails(hwpBuf);

  assert.equal(res.status, "PARSED");
  assert.equal(res.sectionCount, 3);
  assert.equal(res.text.replace(/\s+/g, ""), "123");
});

test("HWP 5.0: 확장 크기 레코드 (size === 0xfff) 정상 파싱", () => {
  // Create a large text (> 4095 bytes)
  const longText = "가".repeat(3000); // 6000 bytes
  const codes = [];
  for (let i = 0; i < longText.length; i++) {
    codes.push(longText.charCodeAt(i));
  }

  const sectionBuf = createParaTextRecord(codes);
  const hwpBuf = createSyntheticHwp({
    headerFlags: 0x01,
    sections: [sectionBuf],
  });

  const res = parseHwpWithDetails(hwpBuf);
  assert.equal(res.status, "PARSED");
  assert.equal(res.text.length, 3000);
});

test("HWP 5.0: 손상된 버퍼 및 비-HWP 버퍼는 예외 없이 CORRUPTED 반환", () => {
  const corruptedBuf = Buffer.from("NOT AN OLE FILE CORRUPTED DATA");
  const res = parseHwpWithDetails(corruptedBuf);
  assert.equal(res.status, "CORRUPTED");
  assert.equal(res.text, "");

  const emptyRes = parseHwpWithDetails(Buffer.alloc(0));
  assert.equal(emptyRes.status, "CORRUPTED");
  assert.equal(emptyRes.text, "");
});
