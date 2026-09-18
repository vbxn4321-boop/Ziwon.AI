import AdmZip from "adm-zip";
import * as CFB from "cfb";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB
export const MAX_ZIP_ENTRIES = 500;
export const MAX_UNCOMPRESSED_TOTAL = 100 * 1024 * 1024; // 100MB
export const MAX_SINGLE_ENTRY = 30 * 1024 * 1024; // 30MB

export type ValidatedDocType = "PDF" | "HWP" | "HWPX" | "DOCX" | "TXT";

export interface ValidationSuccess {
  valid: true;
  docType: ValidatedDocType;
  fileName: string;
  fileSize: number;
}

export interface ValidationFailure {
  valid: false;
  statusCode: 400 | 413 | 415;
  error: string;
}

export type UploadValidationResult = ValidationSuccess | ValidationFailure;

/**
 * Checks if a buffer starts with standard ZIP magic bytes (PK\x03\x04 or PK\x05\x06 or PK\x07\x08)
 */
export function hasZipMagic(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 4) return false;
  return (
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    ((buffer[2] === 0x03 && buffer[3] === 0x04) ||
      (buffer[2] === 0x05 && buffer[3] === 0x06) ||
      (buffer[2] === 0x07 && buffer[3] === 0x08))
  );
}

/**
 * Checks if a buffer is an OLE CFB compound document (HWP 5.0)
 */
export function hasOleCfbMagic(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 8) return false;
  return (
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0 &&
    buffer[4] === 0xa1 &&
    buffer[5] === 0xb1 &&
    buffer[6] === 0x1a &&
    buffer[7] === 0xe1
  );
}

/**
 * Checks if a buffer is a PDF document (%PDF)
 */
export function hasPdfMagic(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 4) return false;
  return buffer.subarray(0, 4).toString("latin1") === "%PDF";
}

/**
 * Validates whether text is genuine plain text rather than binary data.
 */
function isBinaryBuffer(buffer: Buffer): boolean {
  if (!buffer || buffer.length === 0) return false;
  // Check the first 2048 bytes for null bytes or excessive non-printable control characters
  const sample = buffer.subarray(0, Math.min(buffer.length, 2048));
  let nonPrintableCount = 0;

  for (let i = 0; i < sample.length; i++) {
    const byte = sample[i];
    if (byte === 0x00) return true; // Null byte immediately indicates binary
    if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) {
      nonPrintableCount++;
    }
  }

  return nonPrintableCount / sample.length > 0.05;
}

/**
 * Strictly checks if a buffer is a valid HWP 5.0 OLE Compound Document containing the "HWP Document File" header signature.
 */
export function isHwpOleDocument(buffer: Buffer): boolean {
  if (!hasOleCfbMagic(buffer)) return false;
  try {
    const cfb = CFB.read(buffer, { type: "buffer" });
    if (!cfb || !cfb.FullPaths || !cfb.FileIndex) return false;
    const headerIdx = cfb.FullPaths.findIndex((p) =>
      /\/FileHeader$/i.test(p.replace(/\\/g, "/"))
    );
    if (headerIdx < 0) return false;
    const entry = cfb.FileIndex[headerIdx];
    if (!entry?.content || entry.content.length < 18) return false;
    const sig = Buffer.from(entry.content).subarray(0, 18).toString("latin1");
    return sig.startsWith("HWP Document File");
  } catch {
    return false;
  }
}

/**
 * Strictly inspects ZIP archive (HWPX / DOCX) for zip bombs and internal structure.
 */
function validateZipStructure(buffer: Buffer): {
  valid: boolean;
  docType?: "HWPX" | "DOCX";
  error?: string;
  statusCode?: 400 | 413 | 415;
} {
  let zip: AdmZip;
  try {
    zip = new AdmZip(buffer);
  } catch (err: any) {
    return { valid: false, statusCode: 415, error: "ZIP 아카이브 구조가 손상되었습니다." };
  }

  const entries = zip.getEntries();
  if (entries.length > MAX_ZIP_ENTRIES) {
    return {
      valid: false,
      statusCode: 413,
      error: `ZIP 파일 내부 엔트리가 너무 많습니다 (최대 ${MAX_ZIP_ENTRIES}개, 현재 ${entries.length}개).`,
    };
  }

  let totalDeclaredUncompressed = 0;
  let hasHwpxSection = false;
  let hasVersionXml = false;
  let hasWordDocumentXml = false;

  for (const entry of entries) {
    // 1. Header declared uncompressed size check before decompressing
    const headerSize = entry.header?.size || 0;
    if (headerSize > MAX_SINGLE_ENTRY) {
      return {
        valid: false,
        statusCode: 413,
        error: `단일 압축 엔트리 크기가 제한을 초과했습니다 (최대 ${MAX_SINGLE_ENTRY / 1024 / 1024}MB).`,
      };
    }
    totalDeclaredUncompressed += headerSize;
    if (totalDeclaredUncompressed > MAX_UNCOMPRESSED_TOTAL) {
      return {
        valid: false,
        statusCode: 413,
        error: `전체 압축 해제 크기 제한을 초과했습니다 (최대 ${MAX_UNCOMPRESSED_TOTAL / 1024 / 1024}MB).`,
      };
    }

    const name = entry.entryName.toLowerCase().replace(/\\/g, "/");
    if (name === "version.xml") {
      hasVersionXml = true;
    }
    if (name.startsWith("contents/section") || name.startsWith("contents/header") || name.endsWith("contents/section0.xml")) {
      hasHwpxSection = true;
    }
    // DOCX strictly requires exact "word/document.xml"
    if (name === "word/document.xml") {
      hasWordDocumentXml = true;
    }
  }

  const isHwpx = hasHwpxSection || (hasVersionXml && entries.some(e => e.entryName.toLowerCase().startsWith("contents/")));
  const isDocx = hasWordDocumentXml;

  // 2. Validate actual uncompressed size on read
  let actualTotal = 0;
  for (const entry of entries) {
    if (entry.isDirectory) continue;
    let data: Buffer;
    try {
      data = entry.getData();
    } catch (e: any) {
      return { valid: false, statusCode: 415, error: `엔트리 압축 해제 실패: ${entry.entryName}` };
    }
    if (data.length > MAX_SINGLE_ENTRY) {
      return {
        valid: false,
        statusCode: 413,
        error: `단일 엔트리 실제 크기가 제한을 초과했습니다 (최대 ${MAX_SINGLE_ENTRY / 1024 / 1024}MB).`,
      };
    }
    actualTotal += data.length;
    if (actualTotal > MAX_UNCOMPRESSED_TOTAL) {
      return {
        valid: false,
        statusCode: 413,
        error: `전체 실제 압축 해제 크기가 제한을 초과했습니다 (최대 ${MAX_UNCOMPRESSED_TOTAL / 1024 / 1024}MB).`,
      };
    }
  }

  if (isHwpx) return { valid: true, docType: "HWPX" };
  if (isDocx) return { valid: true, docType: "DOCX" };

  return {
    valid: false,
    statusCode: 415,
    error: "일반 ZIP 압축파일 또는 비지원 Office 문서는 지원하지 않습니다. HWP, HWPX, PDF, DOCX 문서를 직접 업로드해 주세요.",
  };
}

/**
 * Strict, secure validator for uploaded plan documents.
 */
export function validateUploadedDocument(buffer: Buffer, rawFileName: string): UploadValidationResult {
  const fileName = (rawFileName || "").trim();
  if (!fileName) {
    return { valid: false, statusCode: 400, error: "파일명이 누락되었습니다." };
  }

  if (!buffer || buffer.length === 0) {
    return { valid: false, statusCode: 400, error: "빈 파일은 업로드할 수 없습니다." };
  }

  if (buffer.length > MAX_UPLOAD_BYTES) {
    return {
      valid: false,
      statusCode: 413,
      error: `파일 크기가 ${MAX_UPLOAD_BYTES / 1024 / 1024}MB를 초과했습니다 (현재 ${(buffer.length / 1024 / 1024).toFixed(1)}MB).`,
    };
  }

  const extMatch = fileName.match(/\.([a-zA-Z0-9]+)$/);
  const ext = (extMatch ? extMatch[1] : "").toLowerCase();

  const allowedExtensions = new Set(["pdf", "docx", "hwpx", "hwp", "txt"]);
  if (!allowedExtensions.has(ext)) {
    return {
      valid: false,
      statusCode: 415,
      error: "지원하지 않는 파일 형식입니다. (PDF, DOCX, HWPX, HWP, TXT 지원)",
    };
  }

  // 1. PDF
  if (ext === "pdf") {
    if (!hasPdfMagic(buffer)) {
      return { valid: false, statusCode: 415, error: "올바른 PDF 파일 형식이 아닙니다 (%PDF 시그니처 누락)." };
    }
    return { valid: true, docType: "PDF", fileName, fileSize: buffer.length };
  }

  // 2. HWP (OLE CFB with FileHeader or ZIP HWPX)
  if (ext === "hwp") {
    if (isHwpOleDocument(buffer)) {
      return { valid: true, docType: "HWP", fileName, fileSize: buffer.length };
    }
    if (hasZipMagic(buffer)) {
      // HWPX disguised as .hwp
      const zipCheck = validateZipStructure(buffer);
      if (zipCheck.valid && zipCheck.docType === "HWPX") {
        return { valid: true, docType: "HWPX", fileName, fileSize: buffer.length };
      }
    }
    return { valid: false, statusCode: 415, error: "올바른 HWP 파일 형식이 아닙니다 (HWP Document File 서명 누락)." };
  }

  // 3. HWPX & DOCX (ZIP-based)
  if (ext === "hwpx" || ext === "docx") {
    if (!hasZipMagic(buffer)) {
      return { valid: false, statusCode: 415, error: `올바른 ${ext.toUpperCase()} 파일 형식이 아닙니다 (ZIP 서명 누락).` };
    }
    const zipCheck = validateZipStructure(buffer);
    if (!zipCheck.valid) {
      return {
        valid: false,
        statusCode: zipCheck.statusCode || 415,
        error: zipCheck.error || "손상된 문서입니다.",
      };
    }
    if (ext === "hwpx" && zipCheck.docType !== "HWPX") {
      return { valid: false, statusCode: 415, error: "HWPX 문서 내부 구조가 올바르지 않습니다." };
    }
    if (ext === "docx" && zipCheck.docType !== "DOCX") {
      return { valid: false, statusCode: 415, error: "DOCX 문서 내부 구조가 올바르지 않습니다 (word/document.xml 누락)." };
    }
    return { valid: true, docType: zipCheck.docType!, fileName, fileSize: buffer.length };
  }

  // 4. Plain Text (.txt)
  if (ext === "txt") {
    if (hasPdfMagic(buffer) || hasOleCfbMagic(buffer) || hasZipMagic(buffer) || isBinaryBuffer(buffer)) {
      return { valid: false, statusCode: 415, error: "바이너리 파일은 TXT 문서로 업로드할 수 없습니다." };
    }
    return { valid: true, docType: "TXT", fileName, fileSize: buffer.length };
  }

  return { valid: false, statusCode: 415, error: "지원하지 않는 파일 형식입니다." };
}
