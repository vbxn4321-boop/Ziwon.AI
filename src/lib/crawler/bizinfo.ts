import { XMLParser } from "fast-xml-parser";

export interface RawNoticeItem {
  externalId: string;
  title: string;
  organizer: string;
  executingAgency?: string;
  category: string;
  region: string;
  targetDescription?: string;
  startDate?: Date;
  endDate?: Date;
  budget?: string;
  officialNoticeNo?: string;
  sourceUrl: string;
  sourceType: "BIZINFO" | "K_STARTUP";
  attachments?: { fileName: string; fileUrl: string; fileType: string }[];
  rawData?: string;
}

/**
 * Fetch real live notices from Bizinfo (기업마당) official OpenAPI
 * Endpoint: https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do
 * When limit is 0 or undefined, fetches ALL available ongoing notices (1,500+ items).
 */
export async function fetchBizinfoNotices(limit?: number): Promise<RawNoticeItem[]> {
  const apiKey = process.env.BIZINFO_API_KEY;

  if (!apiKey) {
    console.warn("BIZINFO_API_KEY is missing in environment variables (.env).");
    return [];
  }

  try {
    const jsonUrl = `https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do?crtfcKey=${encodeURIComponent(
      apiKey
    )}&dataType=json`;
    console.log(
      `[Bizinfo Live Ingestion] Requesting Full API Feed: ${jsonUrl.replace(apiKey, "***REDACTED***")}`
    );

    const res = await fetch(jsonUrl, { next: { revalidate: 1800 } });

    if (res.ok) {
      const json = await res.json();
      const items = json?.jsonArray || json?.items || [];
      const itemList = Array.isArray(items) ? items : [items];

      if (itemList.length > 0) {
        const targetItems = limit && limit > 0 ? itemList.slice(0, limit) : itemList;
        console.log(`[Bizinfo] Extracted ${targetItems.length} live public notice items from feed.`);

        return targetItems.map((item: any, idx: number) => {
          const pblancId = item.pblancId || `PBLN_${idx}`;
          const title = item.pblancNm || "기업마당 지원사업";
          const organizer = item.jnsmAgencyNm || item.refrncNm?.split(" ")[0] || "중소벤처기업부";
          const category = item.pblancPldirNm || item.hashtags?.split(",")[0] || "사업화/기업지원";
          const targetDescription = item.trgetNm || item.hashtags || "중소기업, 소상공인 및 창업기업";
          const sourceUrl = item.pblancUrl || `https://www.bizinfo.go.kr/sii/siia/selectSIIA200Detail.do?pblancId=${pblancId}`;

          let region = "전국";
          const regionMatch = title.match(/^\[([^\]]+)\]/);
          if (regionMatch) {
            region = regionMatch[1];
          }

          const attachments: { fileName: string; fileUrl: string; fileType: string }[] = [];
          if (item.fileNm) {
            const files = String(item.fileNm).split("@");
            files.forEach((fName) => {
              const ext = fName.split(".").pop()?.toUpperCase() || "FILE";
              attachments.push({
                fileName: fName,
                fileUrl: sourceUrl,
                fileType: ext,
              });
            });
          }

          let startDate: Date | undefined;
          let endDate: Date | undefined;

          if (item.reqstBeginEndDe) {
            const parts = item.reqstBeginEndDe.split("~");
            if (parts.length === 2) {
              const startStr = parts[0].trim();
              const endStr = parts[1].trim();
              if (startStr.match(/^\d{4}-\d{2}-\d{2}$/)) startDate = new Date(startStr);
              if (endStr.match(/^\d{4}-\d{2}-\d{2}$/)) endDate = new Date(endStr);
            }
          }

          return {
            externalId: `BIZ_LIVE_${pblancId}`,
            title,
            organizer,
            category,
            region,
            targetDescription,
            startDate,
            endDate,
            officialNoticeNo: pblancId,
            sourceUrl,
            sourceType: "BIZINFO",
            attachments,
            rawData: JSON.stringify(item),
          };
        });
      }
    }
  } catch (err) {
    console.error("Live Bizinfo OpenAPI Fetch error:", err);
  }

  return [];
}
