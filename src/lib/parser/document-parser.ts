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
 * Universal Document Text Extractor
 * Supports PDF, DOCX, HWP, HWPX, TXT, HTML
 */
export async function extractTextFromBuffer(buffer: Buffer, fileTypeOrName: string): Promise<string> {
  const ext = fileTypeOrName.toLowerCase();

  try {
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
 * Download document from URL and extract text.
 */
export async function extractTextFromUrl(fileUrl: string, fileType: string): Promise<string> {
  try {
    const res = await fetch(fileUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://www.bizinfo.go.kr",
      },
      signal: AbortSignal.timeout(8000),
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

    return await extractTextFromBuffer(buffer, fileType);
  } catch (error: any) {
    console.error(`ExtractTextFromUrl error for ${fileUrl}:`, error.message);
    return "";
  }
}
