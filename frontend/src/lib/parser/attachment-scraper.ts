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
      signal: AbortSignal.timeout(20000), // 20s timeout for notice HTML webpage
    });

    if (!res.ok) return [];

    let html = await res.text();
    const urlObj = new URL(sourceUrl);

    // Helper to resolve absolute URL
    const toAbsoluteUrl = (path: string) => {
      let clean = path.replace(/&amp;/g, "&").trim();
      if (clean.startsWith("/")) return `${urlObj.origin}${clean}`;
      if (!clean.startsWith("http")) return `${urlObj.origin}/${clean}`;
      return clean;
    };

    // Follow K-Startup client-side JS redirects (e.g., from ongoing to deadline notice URL)
    const jsRedirectMatch = html.match(/var\s+fullUrl\s*=\s*['"]([^'"]+)['"]/i);
    if (jsRedirectMatch && jsRedirectMatch[1]) {
      const redirectUrl = toAbsoluteUrl(jsRedirectMatch[1]);
      console.log(`🔍 [Dynamic Scraper] Following K-Startup JS redirect to: ${redirectUrl}`);
      try {
        const redirRes = await fetch(redirectUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          signal: AbortSignal.timeout(20000),
        });
        if (redirRes.ok) {
          html = await redirRes.text();
        }
      } catch (redirErr: any) {
        console.warn("[Dynamic Scraper] Failed to follow K-Startup JS redirect:", redirErr.message);
      }
    }

    const candidateEntries: Array<{ url: string; fallbackName: string }> = [];

    // 1. Search for K-Startup specific board_file list items: <li class="clear"> ... <a class="file_bg" title="...">...</a> ... <a href="/afile/fileDownload/..." ...>
    const kstBoardItems = [
      ...html.matchAll(/<li[^>]*class=["'][^"']*clear[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi),
    ];

    for (const item of kstBoardItems) {
      const itemHtml = item[1];
      const dlMatch = itemHtml.match(/href=["']([^"']*(?:\/afile\/fileDownload\/[a-zA-Z0-9_-]+|fileDown\.do[^"']*))["']/i);
      if (dlMatch) {
        const rawHref = toAbsoluteUrl(dlMatch[1]);
        const titleMatch =
          itemHtml.match(/class=["'][^"']*file_bg[^"']*["'][^>]*title=["'](?:\[첨부파일\]\s*)?([^"']+)["']/i) ||
          itemHtml.match(/class=["'][^"']*file_bg[^"']*["'][^>]*>([\s\S]*?)<\/a>/i);
        const fileName = titleMatch
          ? titleMatch[1].replace(/\[첨부파일\]/g, "").replace(/<[^>]+>/g, "").trim()
          : "K-Startup_공고_첨부서식";
        if (!candidateEntries.some((c) => c.url === rawHref)) {
          candidateEntries.push({ url: rawHref, fallbackName: fileName });
        }
      }
    }

    // 2. Search for direct /afile/fileDownload/ links anywhere in HTML
    const afileMatches = [
      ...html.matchAll(/href=["']([^"']*\/afile\/fileDownload\/[a-zA-Z0-9_-]+)["']/gi),
    ];
    for (const match of afileMatches) {
      const rawHref = toAbsoluteUrl(match[1]);
      if (!candidateEntries.some((c) => c.url === rawHref)) {
        candidateEntries.push({ url: rawHref, fallbackName: "K-Startup_공고_첨부파일" });
      }
    }

    // 3. Search for actual binary file download links in HTML DOM (fileDown.do, direct files, etc.)
    const linkMatches = [
      ...html.matchAll(
        /<a[^>]*href=["']([^"']*(?:fileDown\.do|FileDown\.do|download\.do|downloadFile|\.pdf|\.hwp|\.hwpx|\.docx)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi
      ),
    ];

    // 4. Search for fileBlank onclick patterns: onclick="fileBlank('path', 'name')"
    const fileBlankMatches = [
      ...html.matchAll(/fileBlank\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/gi),
    ];

    // 5. Search for K-Startup fn_fileDown / cmm_fileDown onclick patterns: onclick="fn_fileDown('atchFileId', 'fileSn')"
    const fnDownMatches = [
      ...html.matchAll(
        /(?:fn_fileDown|cmm_fileDown|fileDown|file_down|fn_download)\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/gi
      ),
    ];

    // Parse fileBlank matches first (usually contains exact original filename as 2nd param)
    for (const match of fileBlankMatches) {
      const rawHref = toAbsoluteUrl(match[1]);
      const fileName = match[2].trim() || "공고문_첨부파일";
      if (!candidateEntries.some((c) => c.url === rawHref)) {
        candidateEntries.push({ url: rawHref, fallbackName: fileName });
      }
    }

    // Parse K-Startup fn_fileDown / cmm_fileDown matches
    for (const match of fnDownMatches) {
      const atchFileId = match[1];
      const fileSn = match[2];
      const downloadUrl = `${urlObj.origin}/common/file/FileDown.do?atchFileId=${encodeURIComponent(
        atchFileId
      )}&fileSn=${encodeURIComponent(fileSn)}`;
      if (!candidateEntries.some((c) => c.url === downloadUrl)) {
        candidateEntries.push({ url: downloadUrl, fallbackName: `K-Startup_첨부서식_${fileSn}` });
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

    // Prioritize official document formats (PDF, HWP, HWPX, DOCX) ahead of images or generic files
    candidateEntries.sort((a, b) => {
      const aIsDoc = /\.(pdf|hwp|hwpx|docx)/i.test(a.fallbackName + " " + a.url);
      const bIsDoc = /\.(pdf|hwp|hwpx|docx)/i.test(b.fallbackName + " " + b.url);
      if (aIsDoc && !bIsDoc) return -1;
      if (!aIsDoc && bIsDoc) return 1;
      return 0;
    });

    // Expand download limit to 15 files to ensure complete attachments without missing any forms
    const downloadPromises = candidateEntries.slice(0, 15).map(async (entry) => {
      try {
        console.log(`[Scraper] Fetching binary attachment in parallel: ${entry.url}`);
        const binRes = await fetch(entry.url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Referer: sourceUrl,
          },
          signal: AbortSignal.timeout(30000), // Solid 30s timeout for large PDF/HWP files
        });

        if (!binRes.ok) return null;

        const buf = Buffer.from(await binRes.arrayBuffer());
        const binHeader = buf.slice(0, 100).toString("utf-8").toLowerCase();
        if (binHeader.includes("<html") || binHeader.includes("<!doctype")) return null;

        // Decode actual filename from Content-Disposition header
        const contentDisp = binRes.headers.get("content-disposition") || "";
        let finalFileName = entry.fallbackName;

        const fnMatch = contentDisp.match(/filename\*?=(?:UTF-8'')?([^;]+)/i);
        if (fnMatch) {
          try {
            const raw = fnMatch[1].replace(/["']/g, "").trim();
            if (raw.includes("%")) {
              finalFileName = decodeURIComponent(raw).replace(/\+/g, " ");
            } else {
              // Decode Latin1 -> EUC-KR if sent by Korean government server
              try {
                const latinBuf = Buffer.from(raw, "latin1");
                const eucKrDecoded = new TextDecoder("euc-kr").decode(latinBuf);
                if (eucKrDecoded && eucKrDecoded.length > 2 && !eucKrDecoded.includes("\uFFFD")) {
                  finalFileName = eucKrDecoded;
                } else {
                  finalFileName = entry.fallbackName || raw;
                }
              } catch {
                finalFileName = entry.fallbackName || raw;
              }
            }
          } catch {
            finalFileName = fnMatch[1].replace(/["']/g, "").trim();
          }
        }

        // Clean filename of leading [첨부파일] noise
        finalFileName = finalFileName.replace(/^\[(?:첨부파일|붙임)\]\s*/i, "").trim();

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
        } else if (buf.slice(0, 4).toString("hex") === "d0cf11e0") {
          fileType = "HWP";
          finalFileName += ".hwp";
        }

        if (!finalFileName.includes(".")) {
          finalFileName = `${finalFileName}.${fileType.toLowerCase()}`;
        }

        // Extract text
        const extractedText = await extractTextFromBuffer(buf, fileType);

        return {
          fileName: sanitizeUtf8(finalFileName),
          fileUrl: entry.url,
          fileType,
          extractedText: sanitizeUtf8(extractedText),
        } as ScrapedAttachment;
      } catch (err: any) {
        console.warn(`[Dynamic Scraper] Failed to process ${entry.url}:`, err.message);
        return null;
      }
    });

    const results = await Promise.all(downloadPromises);
    const attachments = results.filter((att): att is ScrapedAttachment => att !== null);

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
    } else {
      // Mark as scraped: No binary attachment files on original website (Online URL form or notice-only)
      console.log(`ℹ️ [Dynamic Scraper] No binary attachments on page. Recording NOTICE_ONLY to prevent re-scraping...`);
      await prisma.supportDocument.deleteMany({
        where: { supportProgramId },
      });
      await prisma.supportDocument.create({
        data: {
          id: randomUUID(),
          supportProgramId,
          fileName: "[온라인 신청 공고] 별도 서식 파일 없음 (원문 웹페이지 직접 접수)",
          fileUrl: sourceUrl,
          fileType: "NOTICE_ONLY",
          status: "PARSED",
          extractedText: "본 공고는 별도의 HWP/PDF 서식 파일이 제공되지 않으며, 원문 웹페이지의 온라인 신청 폼 또는 접수처 링크를 통해 직접 신청하는 지원사업입니다.",
        },
      });
    }

    // 6. Enrich SupportSource.rawData with rich HTML sections (제출서류, 지원내용, 선정절차, 소개글 등)
    if (sourceUrl.includes("k-startup.go.kr")) {
      try {
        const enrichedData: Record<string, string> = {};

        // Parse Intro Box
        const introMatch = html.match(/<div class=["']box_inner["']>[\s\S]*?<p class=["']txt["']>([\s\S]*?)<\/p>/i);
        if (introMatch) {
          enrichedData["공고소개"] = introMatch[1].replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim();
        }

        // Parse Information List Sections strictly inside <ul>
        const infoBlockMatches = [...html.matchAll(/<div class=["']information_list["']>([\s\S]*?)<\/ul>/gi)];

        for (const blockMatch of infoBlockMatches) {
          const blockHtml = blockMatch[1];
          const titleMatch = blockHtml.match(/<p class=["']title["']>([^<]+)<\/p>/i);
          const secTitle = titleMatch ? titleMatch[1].trim() : "";

          const dotMatches = [...blockHtml.matchAll(/<li[^>]*class=["']dot_list[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi)];

          for (const dm of dotMatches) {
            const di = dm[1];
            const titMatch = di.match(/<p class=["']tit["']>([^<]+)<\/p>/i);
            const titName = titMatch ? titMatch[1].replace(/[\[\]]/g, "").trim() : "";

            let content = "";
            const txtMatch = di.match(
              /<(?:div|p) class=["'](?:txt|txt-button|list_wrap|list)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|p)>/i
            );
            if (txtMatch) {
              content = txtMatch[1].replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ").trim();
            } else {
              content = di.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ").trim();
              if (titName && content.startsWith(titName)) {
                content = content.substring(titName.length).trim();
              }
            }

            content = content.replace(/[ \t]+/g, " ").trim();

            if (titName && content) {
              if (titName.includes("신청방법")) {
                enrichedData["신청방법"] = content;
              } else if (titName.includes("신청대상")) {
                enrichedData["신청대상"] = content;
              } else if (titName.includes("제외대상") || titName.includes("결격")) {
                enrichedData["제외대상"] = content;
              } else if (titName.includes("신청기간")) {
                enrichedData["신청기간"] = content;
              } else if (titName.includes("제출서류") || secTitle.includes("제출서류")) {
                enrichedData["제출서류"] = content;
              } else if (titName.includes("선정절차") || titName.includes("평가방법") || secTitle.includes("선정절차") || secTitle.includes("평가방법")) {
                enrichedData["선정절차"] = content;
              } else if (titName.includes("지원내용") || secTitle.includes("지원내용")) {
                enrichedData["지원내용"] = content;
              } else if (secTitle.includes("문의처") || titName.includes("문의처")) {
                // Include organization name if present
                const orgName = titName && titName !== "문의처" ? `${titName}: ` : "";
                enrichedData["문의처"] = `${orgName}${content}`;
              } else {
                enrichedData[titName] = content;
              }
            }
          }
        }

        // Update SupportSource rawData in DB
        const existingSources = await prisma.supportSource.findMany({
          where: { supportProgramId, sourceType: "K_STARTUP" },
        });

        for (const src of existingSources) {
          let currentRaw: Record<string, any> = {};
          try {
            currentRaw = typeof src.rawData === "string" ? JSON.parse(src.rawData) : src.rawData;
          } catch {}
          const mergedRaw = { ...currentRaw, ...enrichedData };
          await prisma.supportSource.update({
            where: { id: src.id },
            data: { rawData: JSON.stringify(mergedRaw) },
          });
        }
        console.log(`📋 [Dynamic Scraper] Enriched K-Startup rawData with ${Object.keys(enrichedData).length} clean sections in DB!`);
      } catch (enrichErr: any) {
        console.warn("[Dynamic Scraper] Failed to enrich K-Startup rawData:", enrichErr.message);
      }
    } else if (sourceUrl.includes("bizinfo.go.kr")) {
      try {
        const enrichedData: Record<string, string> = {};

        // Parse Bizinfo view_table (th / td pairs)
        const rowMatches = [
          ...html.matchAll(
            /<tr[^>]*>[\s\S]*?<th[^>]*>([\s\S]*?)<\/th>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi
          ),
        ];

        for (const rm of rowMatches) {
          const th = rm[1].replace(/<[^>]+>/g, "").trim();
          const td = rm[2].replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ").trim();
          if (th && td) {
            enrichedData[th] = td;
            if (th.includes("제출서류")) enrichedData["제출서류"] = td;
            if (th.includes("지원내용")) enrichedData["지원내용"] = td;
            if (th.includes("선정") || th.includes("평가")) enrichedData["선정절차"] = td;
            if (th.includes("신청방법")) enrichedData["신청방법"] = td;
            if (th.includes("문의처") || th.includes("연락처")) enrichedData["문의처"] = td;
          }
        }

        // Update SupportSource rawData in DB for BIZINFO
        const existingSources = await prisma.supportSource.findMany({
          where: { supportProgramId, sourceType: "BIZINFO" },
        });

        for (const src of existingSources) {
          let currentRaw: Record<string, any> = {};
          try {
            currentRaw = typeof src.rawData === "string" ? JSON.parse(src.rawData) : src.rawData;
          } catch {}
          const mergedRaw = { ...currentRaw, ...enrichedData };
          await prisma.supportSource.update({
            where: { id: src.id },
            data: { rawData: JSON.stringify(mergedRaw) },
          });
        }
        console.log(`📋 [Dynamic Scraper] Enriched Bizinfo rawData with ${Object.keys(enrichedData).length} fields in DB!`);
      } catch (enrichErr: any) {
        console.warn("[Dynamic Scraper] Failed to enrich Bizinfo rawData:", enrichErr.message);
      }
    }

    return attachments;
  } catch (err: any) {
    console.error("Failed to dynamically scrape attachments:", err.message);
    return [];
  }
}
