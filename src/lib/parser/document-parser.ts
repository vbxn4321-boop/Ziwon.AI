const pdfParse = require("pdf-parse");
import mammoth from "mammoth";
import AdmZip from "adm-zip";

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

    return fullText.trim();
  } catch (err: any) {
    console.error("HWPX parsing failed:", err.message);
    return "";
  }
}

/**
 * Basic text extraction fallback for binary HWP (OLE5) streams
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
    const matches = rawStr.match(/[\uAC00-\uD7A30-9a-zA-Z가-힣\s,.():~-]{5,}/g);
    if (matches && matches.length > 0) {
      return matches.join("\n").replace(/\s+/g, " ").trim();
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
      const data = await pdfParse(buffer);
      return data.text ? data.text.trim() : "";
    }

    if (ext.endsWith(".docx") || ext === "docx") {
      const result = await mammoth.extractRawText({ buffer });
      return result.value ? result.value.trim() : "";
    }

    if (ext.endsWith(".hwpx") || ext === "hwpx") {
      return extractTextFromHWPX(buffer);
    }

    if (ext.endsWith(".hwp") || ext === "hwp") {
      return extractTextFromHWP(buffer);
    }

    if (ext.endsWith(".html") || ext.endsWith(".htm") || ext === "html") {
      const rawHtml = buffer.toString("utf-8");
      return rawHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    }

    // Plain Text fallback
    return buffer.toString("utf-8").trim();
  } catch (error: any) {
    console.error(`Failed to extract text from ${fileTypeOrName}:`, error.message);
    return "";
  }
}

/**
 * Download document from URL and extract text.
 * Automatically resolves direct binary download links (FileDown.do / .pdf / .hwp) if fileUrl points to an HTML notice webpage.
 */
export async function extractTextFromUrl(fileUrl: string, fileType: string): Promise<string> {
  try {
    const res = await fetch(fileUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
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

      // 1. Search for actual binary file download links in HTML page
      const linkMatches = [
        ...htmlContent.matchAll(
          /href=["']([^"']*(?:FileDown\.do|fileDownload\.do|download\.do|\.pdf|\.hwp|\.hwpx|\.docx)[^"']*)["']/gi
        ),
      ];

      if (linkMatches.length > 0) {
        let targetLink = linkMatches[0][1].replace(/&amp;/g, "&");
        if (targetLink.startsWith("/")) {
          const urlObj = new URL(fileUrl);
          targetLink = `${urlObj.origin}${targetLink}`;
        } else if (!targetLink.startsWith("http")) {
          const urlObj = new URL(fileUrl);
          targetLink = `${urlObj.origin}/${targetLink}`;
        }

        console.log(`[Smart File Link Resolver] Resolving binary download link: ${targetLink}`);
        try {
          const binRes = await fetch(targetLink, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              Referer: fileUrl,
            },
          });

          if (binRes.ok) {
            const binArrayBuffer = await binRes.arrayBuffer();
            const binBuffer = Buffer.from(binArrayBuffer);

            const binHeader = binBuffer.slice(0, 100).toString("utf-8").toLowerCase();
            if (!binHeader.includes("<html") && !binHeader.includes("<!doctype")) {
              return await extractTextFromBuffer(binBuffer, fileType);
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

      return cleanedHtmlText;
    }

    // Direct Binary Buffer Parsing
    return await extractTextFromBuffer(buffer, fileType);
  } catch (err: any) {
    console.error(`Error downloading and extracting ${fileUrl}:`, err.message);
    return "";
  }
}

