import { prisma } from "@/lib/db";
import { extractTextFromUrl } from "@/lib/parser/document-parser";
import { randomUUID } from "crypto";

export interface ScrapedAttachment {
  fileName: string;
  fileUrl: string;
  fileType: string;
}

/**
 * Dynamically scrape missing attachment file links from Notice HTML Webpage
 */
export async function scrapeMissingAttachments(
  supportProgramId: string,
  sourceUrl: string
): Promise<ScrapedAttachment[]> {
  if (!sourceUrl || !sourceUrl.startsWith("http")) {
    return [];
  }

  try {
    console.log(`🔍 [Dynamic Attachment Scraper] Searching webpage for attachments: ${sourceUrl}`);
    const res = await fetch(sourceUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(3500),
    });

    if (!res.ok) return [];

    const html = await res.text();
    const urlObj = new URL(sourceUrl);

    // Search for file download links in HTML DOM
    // Matches hrefs containing FileDown.do, fileDownload.do, or file extensions (.pdf, .hwp, .hwpx, .docx)
    const linkMatches = [
      ...html.matchAll(
        /<a[^>]*href=["']([^"']*(?:FileDown\.do|fileDownload\.do|download\.do|\.pdf|\.hwp|\.hwpx|\.docx)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi
      ),
    ];

    const attachments: ScrapedAttachment[] = [];

    for (const match of linkMatches) {
      let rawHref = match[1].replace(/&amp;/g, "&");
      const rawText = match[2].replace(/<[^>]+>/g, "").trim();

      if (rawHref.startsWith("/")) {
        rawHref = `${urlObj.origin}${rawHref}`;
      } else if (!rawHref.startsWith("http")) {
        rawHref = `${urlObj.origin}/${rawHref}`;
      }

      // Determine filename and extension
      let fileName = rawText || "공고첨부문서";
      const extMatch = (fileName + " " + rawHref).match(/\.(pdf|hwp|hwpx|docx)/i);
      const fileType = extMatch ? extMatch[1].toUpperCase() : "FILE";

      if (!fileName.includes(".")) {
        fileName = `${fileName}.${fileType.toLowerCase()}`;
      }

      // Avoid duplicates in batch
      if (!attachments.some((a) => a.fileUrl === rawHref)) {
        attachments.push({
          fileName,
          fileUrl: rawHref,
          fileType,
        });
      }
      if (attachments.length >= 2) break; // Limit to max 2 attachments for fast Vercel execution
    }

    if (attachments.length > 0) {
      console.log(`✅ [Dynamic Scraper] Found ${attachments.length} missing attachment files! Saving to DB...`);

      const docRecords = [];
      for (const att of attachments) {
        // Extract text from the newly found attachment
        const extractedText = await extractTextFromUrl(att.fileUrl, att.fileType);

        docRecords.push({
          id: randomUUID(),
          supportProgramId,
          fileName: att.fileName,
          fileUrl: att.fileUrl,
          fileType: att.fileType,
          status: extractedText ? "PARSED" : "PENDING",
          extractedText: extractedText || null,
        });
      }

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
