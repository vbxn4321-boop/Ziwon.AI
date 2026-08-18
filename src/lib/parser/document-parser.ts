import mammoth from "mammoth";
import AdmZip from "adm-zip";
import path from "path";
import { pathToFileURL } from "url";

let isWorkerConfigured = false;
function ensurePdfWorkerConfigured(PDFParse: any) {
  if (isWorkerConfigured) return;
  try {
    const workerPath = path.resolve(process.cwd(), "node_modules/pdfjs-dist/build/pdf.worker.mjs");
    const fileUrl = pathToFileURL(workerPath).href;
    PDFParse.setWorker(fileUrl);
    isWorkerConfigured = true;
  } catch (err: any) {
    try {
      PDFParse.setWorker("https://cdn.jsdelivr.net/npm/pdf-parse@latest/dist/pdf-parse/web/pdf.worker.mjs");
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
 */
function extractTextFromHWPX(buffer: Buffer): string {
  try {
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();
    let fullText = "";

    // Search for section XML files in contents/ or Contents/ directory
    for (const entry of zipEntries) {
      if (entry.entryName.toLowerCase().includes("section") && entry.entryName.endsWith(".xml")) {
        const xmlContent = entry.getData().toString("utf-8");
        // Extract text nodes between XML tags
        const cleanedText = xmlContent.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        fullText += cleanedText + "\n\n";
      }
    }

    return sanitizeUtf8(fullText);
  } catch {
    return "";
  }
}

/**
 * Text extraction for binary HWP (OLE5) streams
 */
function extractTextFromHWP(buffer: Buffer): string {
  try {
    // Attempt HWPX ZIP extraction first if file happens to be HWPX renamed to HWP
    const textFromHWPX = extractTextFromHWPX(buffer);
    if (textFromHWPX && textFromHWPX.length > 50) {
      return textFromHWPX;
    }

    // Extract printable Korean/ASCII text strings from binary stream
    const rawStr = buffer.toString("utf-8");
    const matches = rawStr.match(/[가-힣0-9a-zA-Z\s,.():~%\-·\[\]<>/&_]{4,}/g);
    if (matches && matches.length > 0) {
      const filtered = matches
        .map((m) => m.trim())
        .filter((m) => m.length >= 4 && /[가-힣]/.test(m)); // Must contain Korean hangul
      return sanitizeUtf8(filtered.join("\n").replace(/\s+/g, " "));
    }
  } catch (err: any) {
    console.error("HWP stream extraction fallback error:", err.message);
  }
  return "";
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
 * Automatically resolves direct binary download links (fileDown.do / .pdf / .hwp) if fileUrl points to an HTML notice webpage.
 */
export async function extractTextFromUrl(fileUrl: string, fileType: string): Promise<string> {
  try {
    const res = await fetch(fileUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch file from URL (HTTP ${res.status}): ${fileUrl}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Detect if fetched URL returned an HTML Webpage instead of binary document
    const textHeader = buffer.slice(0, 150).toString("utf-8").toLowerCase();
    const isHtmlPage =
      textHeader.includes("<html") ||
      textHeader.includes("<!doctype") ||
      textHeader.includes("<head") ||
      textHeader.includes("<body");

    if (isHtmlPage) {
      const htmlContent = buffer.toString("utf-8");
      const urlObj = new URL(fileUrl);

      // 1. Search for actual binary file download links in HTML page (e.g., /cmm/fms/fileDown.do, FileDown.do, direct files)
      const linkMatches = [
        ...htmlContent.matchAll(
          /href=["']([^"']*(?:fileDown\.do|FileDown\.do|download\.do|\.pdf|\.hwp|\.hwpx|\.docx)[^"']*)["']/gi
        ),
      ];

      // Also search for fileBlank onclick patterns: onclick="fileBlank('path', 'name')"
      const fileBlankMatches = [
        ...htmlContent.matchAll(/fileBlank\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/gi),
      ];

      const candidateLinks: string[] = [];

      for (const m of linkMatches) {
        let rawHref = m[1].replace(/&amp;/g, "&");
        if (rawHref.startsWith("/")) {
          rawHref = `${urlObj.origin}${rawHref}`;
        } else if (!rawHref.startsWith("http")) {
          rawHref = `${urlObj.origin}/${rawHref}`;
        }
        if (!candidateLinks.includes(rawHref)) candidateLinks.push(rawHref);
      }

      for (const m of fileBlankMatches) {
        let path = m[1].trim();
        if (path.startsWith("/")) {
          path = `${urlObj.origin}${path}`;
        } else if (!path.startsWith("http")) {
          path = `${urlObj.origin}/${path}`;
        }
        if (!candidateLinks.includes(path)) candidateLinks.push(path);
      }

      // Prioritize PDF and HWP notices for main text extraction
      const sortedCandidates = candidateLinks.sort((a, b) => {
        const aPdf = a.toLowerCase().includes(".pdf") ? 1 : 0;
        const bPdf = b.toLowerCase().includes(".pdf") ? 1 : 0;
        return bPdf - aPdf;
      });

      for (const targetLink of sortedCandidates) {
        console.log(`[Smart File Link Resolver] Resolving binary download link: ${targetLink}`);
        try {
          const binRes = await fetch(targetLink, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              Referer: fileUrl,
            },
            signal: AbortSignal.timeout(6000),
          });

          if (binRes.ok) {
            const binArrayBuffer = await binRes.arrayBuffer();
            const binBuffer = Buffer.from(binArrayBuffer);

            const binHeader = binBuffer.slice(0, 100).toString("utf-8").toLowerCase();
            if (!binHeader.includes("<html") && !binHeader.includes("<!doctype")) {
              const contentDisp = binRes.headers.get("content-disposition") || "";
              const detectedType = contentDisp.toLowerCase().includes(".pdf") || targetLink.toLowerCase().includes(".pdf")
                ? "PDF"
                : fileType;

              const extracted = await extractTextFromBuffer(binBuffer, detectedType);
              if (extracted && extracted.length > 50) {
                console.log(`✅ [Smart Resolver] Successfully extracted ${extracted.length} chars from binary: ${targetLink}`);
                return extracted;
              }
            }
          }
        } catch (binErr: any) {
          console.warn("[Smart File Link Resolver] Binary download error:", binErr.message);
        }
      }

      // 2. Fallback: Extract main notice content text directly from Webpage HTML DOM
      const cleanedHtmlText = htmlContent
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      return sanitizeUtf8(cleanedHtmlText);
    }

    // Direct Binary Buffer Parsing
    return await extractTextFromBuffer(buffer, fileType);
  } catch (err: any) {
    console.error(`Error downloading and extracting ${fileUrl}:`, err.message);
    return "";
  }
}
