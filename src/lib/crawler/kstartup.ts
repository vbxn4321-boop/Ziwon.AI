import { XMLParser } from "fast-xml-parser";
import { RawNoticeItem } from "./bizinfo";

/**
 * Fetch real live notices from official K-Startup Public OpenAPI (data.go.kr)
 * Endpoint: https://apis.data.go.kr/B552735/kisedKstartupService01/getAnnouncementInformation01
 */
export async function fetchKStartupNotices(limit = 10): Promise<RawNoticeItem[]> {
  const apiKey = process.env.KSTARTUP_API_KEY;

  if (!apiKey) {
    console.warn("KSTARTUP_API_KEY is missing in environment variables (.env).");
    return [];
  }

  try {
    const url = `https://apis.data.go.kr/B552735/kisedKstartupService01/getAnnouncementInformation01?serviceKey=${apiKey}&pageNo=1&numOfRows=${limit}`;
    console.log(`[K-Startup Live Ingestion] Requesting API: ${url.replace(apiKey, "***REDACTED***")}`);

    const res = await fetch(url, { next: { revalidate: 1800 } });

    if (res.ok) {
      const xmlText = await res.text();
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
      });
      const parsed = parser.parse(xmlText);
      const items = parsed?.results?.data?.item || [];
      const itemList = Array.isArray(items) ? items : [items];

      if (itemList.length > 0) {
        return itemList.map((itemObj: any, idx: number) => {
          // Parse <col name="..."> elements
          const cols: Record<string, string> = {};
          const colArray = Array.isArray(itemObj.col) ? itemObj.col : [itemObj.col];
          colArray.forEach((c: any) => {
            if (c && c["@_name"]) {
              cols[c["@_name"]] = String(c["#text"] || c["#cdata"] || c["text"] || "").trim();
            }
          });

          // Exact field for K-Startup Notice Title: biz_pbanc_nm || intg_pbanc_biz_nm
          const title =
            cols["biz_pbanc_nm"] ||
            cols["intg_pbanc_biz_nm"] ||
            cols["detl_pg_title"] ||
            `K-Startup 지원사업 공고 ${idx + 1}`;

          const organizer = cols["pbanc_ntrp_nm"] || "중소벤처기업부";
          const category = cols["supt_biz_clsfc"] || "창업/사업화";
          const region = cols["supt_regin"] || "전국";
          const targetDescription = cols["aply_trgt_ctnt"] || cols["biz_enyy"] || "창업 7년 이내 기업 및 예비창업자";
          const sourceUrl =
            cols["detl_pg_url"] ||
            cols["aply_mthd_onli_rcpt_istc"] ||
            "https://www.k-startup.go.kr";
          const officialNoticeNo = cols["prch_cnpl_no"] || cols["pbanc_sn"] || undefined;
          const externalId = `KST_LIVE_${cols["pbanc_sn"] || cols["prch_cnpl_no"] || idx}`;

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

          return {
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
          };
        });
      }
    }
  } catch (err) {
    console.error("Live K-Startup OpenAPI Fetch error:", err);
  }

  return [];
}
