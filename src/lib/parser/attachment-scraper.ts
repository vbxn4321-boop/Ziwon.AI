import { prisma } from "@/lib/db";
import { extractTextFromBuffer, sanitizeUtf8 } from "@/lib/parser/document-parser";
import { randomUUID } from "crypto";

export interface ScrapedAttachment {
  fileName: string;
  fileUrl: string;
  fileType: string;
  extractedText?: string;
}

/**
 * Dynamically scrape actual binary attachment file download links from Notice HTML Webpage
 */
export async function scrapeMissingAttachments(
  supportProgramId: string,
  sourceUrl: string
): Promise<ScrapedAttachment[]> {
  if (!sourceUrl || !sourceUrl.startsWith("http")) {
    return [];
  }

  try {
    console.log(`🔍 [Dynamic Attachment Scraper] Scraping webpage for binary attachments: ${sourceUrl}`);
    const res = await fetch(sourceUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return [];

    const html = await res.text();
    const urlObj = new URL(sourceUrl);

    // 1. Search for actual binary file download links in HTML DOM (fileDown.do, direct files, etc.)
    const linkMatches = [
      ...html.matchAll(
        /<a[^>]*href=["']([^"']*(?:fileDown\.do|FileDown\.do|download\.do|\.pdf|\.hwp|\.hwpx|\.docx)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi
      ),
    ];

    // 2. Search for fileBlank onclick patterns: onclick="fileBlank('path', 'name')"
    const fileBlankMatches = [
      ...html.matchAll(/fileBlank\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/gi),
    ];

    // Helper to resolve absolute URL
    const toAbsoluteUrl = (path: string) => {
      let clean = path.replace(/&amp;/g, "&").trim();
      if (clean.startsWith("/")) return `${urlObj.origin}${clean}`;
      if (!clean.startsWith("http")) return `${urlObj.origin}/${clean}`;
      return clean;
    };

    const candidateEntries: Array<{ url: string; fallbackName: string }> = [];

    // Parse fileBlank matches first (usually contains exact original filename as 2nd param)
    for (const match of fileBlankMatches) {
      const rawHref = toAbsoluteUrl(match[1]);
      const fileName = match[2].trim() || "공고문_첨부파일";
      if (!candidateEntries.some((c) => c.url === rawHref)) {
        candidateEntries.push({ url: rawHref, fallbackName: fileName });
      }
    }

    // Parse <a> link matches
    for (const match of linkMatches) {
      const rawHref = toAbsoluteUrl(match[1]);
      const fullTag = match[0];
      const linkText = match[2].replace(/<[^>]+>/g, "").trim();

      // Look for title="... (filename) ..." or aria-label in tag
      let titleName = "";
      const titleMatch = fullTag.match(/title=["'](?:첨부파일\s*)?([^"']+)["']/i);
      if (titleMatch) {
        titleName = titleMatch[1].replace(/다운로드|바로보기|새\s*창\s*열기/gi, "").trim();
      }

      const candidateName = titleName || linkText || "공고문_첨부파일";

      if (!candidateEntries.some((c) => c.url === rawHref)) {
        candidateEntries.push({ url: rawHref, fallbackName: candidateName });
      }
    }

    const attachments: ScrapedAttachment[] = [];

    for (const entry of candidateEntries.slice(0, 4)) {
      try {
        console.log(`[Scraper] Fetching binary attachment: ${entry.url}`);
        const binRes = await fetch(entry.url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Referer: sourceUrl,
          },
          signal: AbortSignal.timeout(6000),
        });

        if (!binRes.ok) continue;

        const buf = Buffer.from(await binRes.arrayBuffer());
        const binHeader = buf.slice(0, 100).toString("utf-8").toLowerCase();
        if (binHeader.includes("<html") || binHeader.includes("<!doctype")) continue;

        // Decode actual filename from Content-Disposition header
        const contentDisp = binRes.headers.get("content-disposition") || "";
        let finalFileName = entry.fallbackName;

        const fnMatch = contentDisp.match(/filename\*?=(?:UTF-8'')?([^;]+)/i);
        if (fnMatch) {
          try {
            const raw = fnMatch[1].replace(/["']/g, "").trim();
            finalFileName = decodeURIComponent(raw).replace(/\+/g, " ");
          } catch {
            finalFileName = fnMatch[1].replace(/["']/g, "").trim();
          }
        }

        // Determine file type
        let fileType = "FILE";
        const extMatch = (finalFileName + " " + entry.url).match(/\.(pdf|hwpx|hwp|docx)/i);
        if (extMatch) {
          fileType = extMatch[1].toUpperCase();
        } else if (buf.slice(0, 4).toString("hex") === "25504446") {
          fileType = "PDF";
          finalFileName += ".pdf";
        } else if (buf.slice(0, 2).toString("utf-8") === "PK") {
          fileType = "HWPX";
          finalFileName += ".hwpx";
        }

        if (!finalFileName.includes(".")) {
          finalFileName = `${finalFileName}.${fileType.toLowerCase()}`;
        }

        // Extract text
        const extractedText = await extractTextFromBuffer(buf, fileType);

        attachments.push({
          fileName: sanitizeUtf8(finalFileName),
          fileUrl: entry.url,
          fileType,
          extractedText: sanitizeUtf8(extractedText),
        });
      } catch (err: any) {
        console.warn(`[Dynamic Scraper] Failed to process ${entry.url}:`, err.message);
      }
    }

    if (attachments.length > 0) {
      console.log(`✅ [Dynamic Scraper] Successfully extracted ${attachments.length} attachment files! Saving to DB...`);

      const docRecords = attachments.map((att) => ({
        id: randomUUID(),
        supportProgramId,
        fileName: att.fileName,
        fileUrl: att.fileUrl,
        fileType: att.fileType,
        status: att.extractedText && att.extractedText.length > 50 ? "PARSED" : "PENDING",
        extractedText: att.extractedText && att.extractedText.length > 50 ? att.extractedText : null,
      }));

      // Replace existing documents completely to prevent duplicates
      await prisma.supportDocument.deleteMany({
        where: {
          supportProgramId,
        },
      });

      await prisma.supportDocument.createMany({
        data: docRecords,
      });
    }

    return attachments;
  } catch (err: any) {
    console.error("Failed to dynamically scrape attachments:", err.message);
    return [];
  }
}
