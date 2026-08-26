import { XMLParser } from "fast-xml-parser";
import { RawNoticeItem } from "./bizinfo";

/**
 * Fetch real live notices from official K-Startup Public OpenAPI (data.go.kr)
 * Multi-page loop fetches all available ongoing notices up to target limit (e.g. 100 items).
 */
export async function fetchKStartupNotices(limit = 100): Promise<RawNoticeItem[]> {
  const apiKey = process.env.KSTARTUP_API_KEY;

  if (!apiKey) {
    console.warn("KSTARTUP_API_KEY is missing in environment variables (.env).");
    return [];
  }

  const allNotices: RawNoticeItem[] = [];
  const numOfRows = 50;
  let pageNo = 1;
  const maxPages = Math.ceil(limit / numOfRows);

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  try {
    const cleanKey = decodeURIComponent(apiKey);
    while (pageNo <= maxPages) {
      const url = `https://apis.data.go.kr/B552735/kisedKstartupService01/getAnnouncementInformation01?serviceKey=${encodeURIComponent(
        cleanKey
      )}&pageNo=${pageNo}&numOfRows=${numOfRows}`;
      console.log(`[K-Startup Live Ingestion] Fetching Page ${pageNo}/${maxPages}: ${url.replace(encodeURIComponent(cleanKey), "***REDACTED***")}`);

      const res = await fetch(url, { next: { revalidate: 1800 } });

      if (!res.ok) break;

      const xmlText = await res.text();
      const parsed = parser.parse(xmlText);
      const items = parsed?.results?.data?.item || [];
      const itemList = Array.isArray(items) ? items : items ? [items] : [];

      if (itemList.length === 0) break;

      itemList.forEach((itemObj: any, idx: number) => {
        const cols: Record<string, string> = {};
        const colArray = Array.isArray(itemObj.col) ? itemObj.col : [itemObj.col];
        colArray.forEach((c: any) => {
          if (c && c["@_name"]) {
            cols[c["@_name"]] = String(c["#text"] || c["#cdata"] || c["text"] || "").trim();
          }
        });

        const title =
          cols["biz_pbanc_nm"] ||
          cols["intg_pbanc_biz_nm"] ||
          cols["detl_pg_title"] ||
          `K-Startup 지원사업 공고 ${allNotices.length + 1}`;

        const organizer = cols["pbanc_ntrp_nm"] || "중소벤처기업부";
        const category = cols["supt_biz_clsfc"] || "창업/사업화";
        const region = cols["supt_regin"] || "전국";
        const targetDescription = cols["aply_trgt_ctnt"] || cols["biz_enyy"] || "창업 7년 이내 기업 및 예비창업자";
        const sourceUrl =
          cols["detl_pg_url"] ||
          cols["aply_mthd_onli_rcpt_istc"] ||
          "https://www.k-startup.go.kr";
        const officialNoticeNo = cols["prch_cnpl_no"] || cols["pbanc_sn"] || undefined;
        const externalId = `KST_LIVE_${cols["pbanc_sn"] || cols["prch_cnpl_no"] || allNotices.length}`;

        let startDate: Date | undefined;
        let endDate: Date | undefined;

        if (cols["pbanc_rcpt_bgng_dt"] && cols["pbanc_rcpt_bgng_dt"].length === 8) {
          const y = cols["pbanc_rcpt_bgng_dt"].substring(0, 4);
          const m = cols["pbanc_rcpt_bgng_dt"].substring(4, 6);
          const d = cols["pbanc_rcpt_bgng_dt"].substring(6, 8);
          startDate = new Date(`${y}-${m}-${d}`);
        }

        if (cols["pbanc_rcpt_end_dt"] && cols["pbanc_rcpt_end_dt"].length === 8) {
          const y = cols["pbanc_rcpt_end_dt"].substring(0, 4);
          const m = cols["pbanc_rcpt_end_dt"].substring(4, 6);
          const d = cols["pbanc_rcpt_end_dt"].substring(6, 8);
          endDate = new Date(`${y}-${m}-${d}`);
        }

        allNotices.push({
          externalId,
          title,
          organizer,
          category,
          region,
          targetDescription,
          startDate,
          endDate,
          officialNoticeNo,
          sourceUrl,
          sourceType: "K_STARTUP",
          rawData: JSON.stringify(cols),
        });
      });

      if (itemList.length < numOfRows) break;
      pageNo++;
    }
  } catch (err) {
    console.error("Live K-Startup OpenAPI Fetch error:", err);
  }

  console.log(`[K-Startup] Total ${allNotices.length} live public notices fetched across pages.`);
  return allNotices;
}
