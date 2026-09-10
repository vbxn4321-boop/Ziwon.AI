import mammoth from "mammoth";
import AdmZip from "adm-zip";
import * as CFB from "cfb";
import zlib from "zlib";
import path from "path";
import { pathToFileURL } from "url";

let isWorkerConfigured = false;
function ensurePdfWorkerConfigured(PDFParse: any) {
  if (isWorkerConfigured) return;
  try {
    const workerPath = path.resolve(process.cwd(), "node_modules/pdf-parse/dist/pdf-parse/web/pdf.worker.mjs");
    const fileUrl = pathToFileURL(workerPath).href;
    PDFParse.setWorker(fileUrl);
    isWorkerConfigured = true;
  } catch (err: any) {
    try {
      const fallbackPath = path.resolve(process.cwd(), "node_modules/pdfjs-dist/build/pdf.worker.mjs");
      PDFParse.setWorker(pathToFileURL(fallbackPath).href);
      isWorkerConfigured = true;
    } catch {}
  }
}

/**
 * Remove PostgreSQL-incompatible null bytes (0x00) and unprintable control characters
 */
export function sanitizeUtf8(str: string): string {
  if (!str) return "";
  return str
    .replace(/\0/g, "")
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, "")
    .trim();
}

/**
 * Extract plain text from HWPX (ZIP-compressed XML format)
 * Preserves paragraph breaks (<hp:p>) and text blocks (<hp:t>)
 */
export function extractTextFromHWPX(buffer: Buffer): string {
  try {
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();
    let fullText = "";

    for (const entry of zipEntries) {
      const name = entry.entryName.toLowerCase();
      if ((name.includes("section") || name.includes("content") || name.includes("header")) && name.endsWith(".xml")) {
        const xml = entry.getData().toString("utf-8");
        // Extract paragraph <hp:p> and text <hp:t> or <hh:t>
        const paragraphs = xml.match(/<h[p|h]:p[\s\S]*?<\/h[p|h]:p>/gi) || [xml];
        for (const p of paragraphs) {
          const tMatches = [...p.matchAll(/<h[p|h]:t[^>]*>([\s\S]*?)<\/h[p|h]:t>/gi)];
          if (tMatches.length > 0) {
            const line = tMatches
              .map((m) => m[1].replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"))
              .join(" ")
              .trim();
            if (line) fullText += line + "\n";
          }
        }
      }
    }

    return sanitizeUtf8(fullText);
  } catch (err: any) {
    return "";
  }
}

/**
 * High-accuracy binary HWP 5.0 (OLE5 CFBF Compound Document) Text Extractor
 * Decompresses Section streams using zlib, skips extended control binary headers,
 * and decodes clean UTF-16LE Korean & ASCII text without garbage tokens.
 */
export function extractTextFromHWP(buffer: Buffer): string {
  try {
    // 1. If HWP file is actually an HWPX (ZIP) with .hwp extension
    const hwpxAttempt = extractTextFromHWPX(buffer);
    if (hwpxAttempt && hwpxAttempt.length > 50) {
      return hwpxAttempt;
    }

    // 2. Parse OLE Compound Document
    const cfb = CFB.read(buffer, { type: "buffer" });
    const sectionEntries = cfb.FileIndex.filter((entry) =>
      entry.name.includes("BodyText/Section") || entry.name.includes("Section")
    );

    if (sectionEntries.length === 0) {
      return "";
    }

    let fullText = "";

    for (const entry of sectionEntries) {
      if (!entry.content || entry.content.length === 0) continue;

      const rawBuf = Buffer.from(entry.content);
      let decompressed: Buffer;

      try {
        decompressed = zlib.inflateRawSync(rawBuf);
      } catch {
        try {
          decompressed = zlib.inflateSync(rawBuf);
        } catch {
          decompressed = rawBuf;
        }
      }

      // Parse HWP 5.0 Paragraph records from decompressed buffer
      let text = "";
      let offset = 0;

      while (offset + 4 <= decompressed.length) {
        const header = decompressed.readUInt32LE(offset);
        offset += 4;

        const tagId = header & 0x3ff;
        let size = (header >> 20) & 0xfff;

        if (size === 0xfff) {
          if (offset + 4 <= decompressed.length) {
            size = decompressed.readUInt32LE(offset);
            offset += 4;
          }
        }

        if (offset + size > decompressed.length) {
          break;
        }

        // Tag ID 67: HWPTAG_PARA_TEXT (Paragraph text content in UTF-16LE)
        if (tagId === 67) {
          const textBuf = decompressed.slice(offset, offset + size);
          let paraText = "";
          let i = 0;

          while (i < textBuf.length - 1) {
            const charCode = textBuf.readUInt16LE(i);
            i += 2;

            if (charCode === 10 || charCode === 13) {
              paraText += "\n";
            } else if (charCode === 9) {
              paraText += "  ";
            } else if (charCode < 32) {
              // Skip 12 words (24 bytes) of extended control properties
              i += 24;
              continue;
            } else {
              // Accept only valid Hangul, ASCII, Numbers, and Korean special punctuation & symbols
              const isHangul =
                (charCode >= 0xac00 && charCode <= 0xd7af) ||
                (charCode >= 0x3130 && charCode <= 0x318f) ||
                (charCode >= 0x1100 && charCode <= 0x11ff);
              const isAscii = charCode >= 0x20 && charCode <= 0x7e;
              const isPunctuation =
                (charCode >= 0x2000 && charCode <= 0x206f) ||
                (charCode >= 0x2190 && charCode <= 0x26ff) ||
                (charCode >= 0x3000 && charCode <= 0x303f) ||
                (charCode >= 0x3200 && charCode <= 0x33ff) ||
                (charCode >= 0xff00 && charCode <= 0xffef);

              if (isHangul || isAscii || isPunctuation) {
                paraText += String.fromCharCode(charCode);
              }
            }
          }

          const cleanedLine = paraText.replace(/[\r\n]+/g, "\n").trim();
          if (cleanedLine) {
            text += cleanedLine + "\n";
          }
        }

        offset += size;
      }

      if (text) {
        fullText += text + "\n";
      }
    }

    return sanitizeUtf8(fullText);
  } catch (err: any) {
    return "";
  }
}

/**
 * ZIP 로컬/중앙 헤더의 general purpose flag 11번 비트. 켜져 있으면 파일명이 UTF-8이다.
 */
const ZIP_UTF8_NAME_FLAG = 0x0800;

/** 재귀적으로 파고들 중첩 ZIP 의 최대 깊이 */
const MAX_ZIP_DEPTH = 3;

/** 문서가 아니거나 브라우저로 넘길 수 없는 확장자 */
const NON_DOCUMENT_EXT = /\.(exe|dll|com|bat|cmd|msi|scr|mp4|avi|mov|wmv|iso)$/i;

/**
 * ZIP 엔트리 파일명 디코딩
 *
 * adm-zip 은 엔트리명을 항상 UTF-8 로 해석하므로, 국내 공고문 ZIP 에서 흔한
 * CP949(EUC-KR) 파일명이 그대로면 깨진다. UTF-8 플래그를 먼저 확인하고,
 * 꺼져 있을 때만 CP949 로 해석한다. (아카이브 단위로 동작하는 adm-zip 의
 * decoder 옵션은 UTF-8 과 CP949 가 섞인 ZIP 을 처리하지 못한다.)
 */
export function decodeZipEntryName(entry: any): string {
  const raw = entry?.rawEntryName;
  if (!raw || !Buffer.isBuffer(raw)) return entry?.entryName || "";

  if ((entry?.header?.flags || 0) & ZIP_UTF8_NAME_FLAG) {
    return raw.toString("utf-8");
  }

  // 순수 ASCII 는 어떤 인코딩으로 읽어도 결과가 같다
  if (raw.every((b: number) => b < 0x80)) return raw.toString("latin1");

  try {
    // fatal 모드라 CP949 로 성립하지 않는 바이트열이면 예외가 난다
    return new TextDecoder("euc-kr", { fatal: true }).decode(raw);
  } catch {
    return raw.toString("utf-8");
  }
}

/**
 * 버퍼의 매직 넘버가 ZIP(PK) 인지 확인
 */
function hasZipMagic(buffer: Buffer): boolean {
  return !!buffer && buffer.length >= 4 && buffer.slice(0, 2).toString("latin1") === "PK";
}

/**
 * HWPX/DOCX가 아닌 순수 일반 ZIP 압축 파일인지 확인
 */
export function isRegularZip(buffer: Buffer): boolean {
  if (!hasZipMagic(buffer)) return false;
  try {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    if (entries.length === 0) return false;
    const names = entries.map((e) => decodeZipEntryName(e).toLowerCase());
    if (names.some((n) => n.includes("contents/section") || n === "version.xml")) return false;
    if (names.some((n) => n.includes("word/document") || n === "[content_types].xml")) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * 파일명과 매직 넘버로 문서 종류 판별
 */
export function detectDocumentType(fileName: string, data: Buffer): string {
  const lower = fileName.toLowerCase();
  const magic = data.slice(0, 4).toString("hex");

  if (lower.endsWith(".pdf") || magic === "25504446") return "PDF";
  if (lower.endsWith(".hwpx")) return "HWPX";
  if (lower.endsWith(".hwp") || magic === "d0cf11e0") return "HWP";
  if (lower.endsWith(".docx")) return "DOCX";
  if (lower.endsWith(".doc")) return "DOC";
  if (lower.endsWith(".txt")) return "TXT";
  if (lower.endsWith(".png")) return "PNG";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "JPG";
  if (lower.endsWith(".gif")) return "GIF";
  if (lower.endsWith(".zip")) return "ZIP";
  return "FILE";
}

export interface ExtractedSubDocument {
  fileName: string;
  fileType: string;
  /** ZIP 내부 경로. 중첩 ZIP 은 "바깥.zip/안쪽.hwp" 처럼 슬래시로 이어 붙인다. */
  entryPath: string;
  buffer: Buffer;
  extractedText: string;
}

/**
 * ZIP 아카이브 내부의 개별 문서(PDF, HWP, HWPX, DOCX 등)를 인메모리에서 추출하여 파싱
 *
 * 엔트리 하나가 실패해도 나머지는 계속 처리한다. adm-zip 은 STORED/Deflate 만
 * 지원해서, 알집·반디집이 만든 Deflate64·LZMA·bzip2 엔트리는 getData() 에서
 * 예외가 난다. 예전처럼 루프 전체를 try 하나로 감싸면 그런 엔트리 하나 때문에
 * 아카이브 전체가 버려진다.
 */
export async function extractDocumentsFromZip(
  buffer: Buffer,
  depth = 0,
  parentPath = ""
): Promise<ExtractedSubDocument[]> {
  const extractedDocs: ExtractedSubDocument[] = [];

  let entries: any[];
  try {
    entries = new AdmZip(buffer).getEntries();
  } catch (err: any) {
    console.warn("[ZIP Extractor] 아카이브를 열 수 없습니다:", err.message);
    return extractedDocs;
  }

  for (const entry of entries) {
    if (entry.isDirectory) continue;

    const entryName = decodeZipEntryName(entry);
    if (!entryName || entryName.includes("__MACOSX") || entryName.startsWith(".")) continue;

    const cleanFileName = path.basename(entryName).trim();
    if (!cleanFileName || cleanFileName.startsWith(".")) continue;
    if (NON_DOCUMENT_EXT.test(cleanFileName)) continue;

    let fileData: Buffer;
    try {
      fileData = entry.getData();
    } catch (err: any) {
      console.warn(`[ZIP Extractor] 엔트리 해제 실패 (${cleanFileName}): ${err.message}`);
      continue;
    }
    if (!fileData || fileData.length === 0) continue;

    const entryPath = parentPath ? `${parentPath}/${entryName}` : entryName;

    // 중첩 ZIP 은 한 단계 더 풀어서 내부 문서를 끌어올린다
    if (hasZipMagic(fileData) && isRegularZip(fileData)) {
      if (depth >= MAX_ZIP_DEPTH) {
        console.warn(`[ZIP Extractor] 중첩 깊이 초과로 건너뜁니다: ${entryPath}`);
        continue;
      }
      extractedDocs.push(...(await extractDocumentsFromZip(fileData, depth + 1, entryPath)));
      continue;
    }

    const fileType = detectDocumentType(cleanFileName, fileData);
    const extractedText = await extractTextFromBuffer(fileData, fileType);

    extractedDocs.push({
      fileName: cleanFileName,
      fileType,
      entryPath,
      buffer: fileData,
      extractedText: sanitizeUtf8(extractedText),
    });
  }

  return extractedDocs;
}

/**
 * ZIP 버퍼에서 entryPath 하나만 꺼낸다. 다운로드 프록시가 압축 내부 파일을
 * 개별 파일처럼 내려주기 위해 사용한다. 찾지 못하면 null.
 */
export function extractZipEntry(buffer: Buffer, entryPath: string, depth = 0): Buffer | null {
  if (!entryPath || depth > MAX_ZIP_DEPTH) return null;

  let entries: any[];
  try {
    entries = new AdmZip(buffer).getEntries();
  } catch {
    return null;
  }

  const files = entries.filter((e) => !e.isDirectory);

  // 1) 같은 아카이브 안에서 경로가 정확히 일치하는 엔트리
  for (const entry of files) {
    if (decodeZipEntryName(entry) !== entryPath) continue;
    try {
      return entry.getData();
    } catch {
      return null;
    }
  }

  // 2) "바깥.zip/안쪽.hwp" 형태면 바깥 엔트리를 풀고 나머지 경로로 다시 찾는다
  for (const entry of files) {
    const prefix = decodeZipEntryName(entry) + "/";
    if (!entryPath.startsWith(prefix)) continue;
    try {
      const nested = extractZipEntry(entry.getData(), entryPath.slice(prefix.length), depth + 1);
      if (nested) return nested;
    } catch {
      // 이 엔트리는 못 풀어도 다른 후보가 있을 수 있다
    }
  }

  return null;
}

/**
 * Universal Document Text Extractor
 * Supports PDF, DOCX, HWP, HWPX, TXT, HTML
 */
export async function extractTextFromBuffer(buffer: Buffer, fileTypeOrName: string): Promise<string> {
  const ext = fileTypeOrName.toLowerCase();

  try {
    if (ext.endsWith(".zip") || ext === "zip" || isRegularZip(buffer)) {
      const subDocs = await extractDocumentsFromZip(buffer);
      if (subDocs.length > 0) {
        return subDocs
          .filter((d) => d.extractedText && d.extractedText.length > 10)
          .map((d) => `=== [첨부파일: ${d.fileName}] ===\n${d.extractedText}`)
          .join("\n\n");
      }
      return "";
    }

    if (ext.endsWith(".pdf") || ext === "pdf") {
      try {
        const { PDFParse } = require("pdf-parse");
        ensurePdfWorkerConfigured(PDFParse);

        const uint8 = new Uint8Array(buffer);
        const parser = new PDFParse(uint8);
        const textResult = await parser.getText();
        if (textResult && typeof textResult.text === "string") {
          return sanitizeUtf8(textResult.text);
        }
      } catch (pdfErr: any) {
        console.warn("[pdf-parse] PDF extraction error:", pdfErr.message);
      }
      return "";
    }

    if (ext.endsWith(".docx") || ext === "docx") {
      const result = await mammoth.extractRawText({ buffer });
      return result.value ? sanitizeUtf8(result.value) : "";
    }

    if (ext.endsWith(".hwpx") || ext === "hwpx") {
      return extractTextFromHWPX(buffer);
    }

    if (ext.endsWith(".hwp") || ext === "hwp") {
      return extractTextFromHWP(buffer);
    }

    if (ext.endsWith(".html") || ext.endsWith(".htm") || ext === "html") {
      const rawHtml = buffer.toString("utf-8");
      const cleaned = rawHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      return sanitizeUtf8(cleaned);
    }

    // Plain Text fallback
    return sanitizeUtf8(buffer.toString("utf-8"));
  } catch (error: any) {
    console.error(`Failed to extract text from ${fileTypeOrName}:`, error.message);
    return "";
  }
}

/**
 * Download document from URL and extract text (Delegates to Python Backend first).
 */
export async function extractTextFromUrl(
  fileUrl: string,
  fileType: string,
  entryPath?: string | null
): Promise<string> {
  // 1. Try Python FastAPI Backend Parser First (Best HWP/PDF accuracy)
  //    ZIP 내부 문서는 URL 만으로 지목할 수 없으므로 아래 Node 파서로 직행한다.
  if (!entryPath) {
    try {
      const { parseDocumentWithBackend } = await import("@/lib/backend-client");
      const backendRes = await parseDocumentWithBackend(fileUrl, fileType);
      if (backendRes && backendRes.extractedText && backendRes.extractedText.length > 20) {
        console.log(`🐍 [Python Parser] Successfully extracted ${backendRes.characterCount} chars from ${fileType}`);
        return sanitizeUtf8(backendRes.extractedText);
      }
    } catch (backendErr: any) {
      // Python backend not running or network issue, smoothly fallback to Node parser
    }
  }

    // 2. Node.js local fallback parser
    try {
      const res = await fetch(fileUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Referer: "https://www.bizinfo.go.kr",
        },
        signal: AbortSignal.timeout(30000), // Solid 30s timeout for document downloading
      });

    if (!res.ok) {
      throw new Error(`Failed to fetch file from URL (HTTP ${res.status}): ${fileUrl}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Detect if fetched URL returned an HTML Webpage instead of binary document
    const textHeader = buffer.slice(0, 150).toString("utf-8").toLowerCase();
    const isHtmlPage = textHeader.includes("<html") || textHeader.includes("<!doctype");

    if (isHtmlPage) {
      return "";
    }

    if (entryPath) {
      const entryData = extractZipEntry(buffer, entryPath);
      if (!entryData) {
        console.warn(`[ExtractTextFromUrl] ZIP 내부 문서를 찾지 못했습니다: ${entryPath}`);
        return "";
      }
      return await extractTextFromBuffer(entryData, fileType);
    }

    return await extractTextFromBuffer(buffer, fileType);
  } catch (error: any) {
    console.error(`ExtractTextFromUrl error for ${fileUrl}:`, error.message);
    return "";
  }
}
