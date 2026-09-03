import asyncio
import sys
import uuid
import json
import httpx
from datetime import datetime
import xml.etree.ElementTree as ET
from sqlalchemy import text
from app.core.database import SessionLocal
from app.core.config import settings
from app.services.dedup_service import normalize_title, DedupService

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

class CrawlerService:
    @staticmethod
    async def fetch_bizinfo(limit: int = 0) -> list:
        """Fetch live notices from Bizinfo (기업마당) OpenAPI with 120s timeout and clear error diagnostics."""
        url = "https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do"
        search_cnt = limit if limit > 0 else 500
        api_key = settings.BIZINFO_API_KEY
        
        if not api_key:
            print("[Bizinfo API Warning]: ⚠️ BIZINFO_API_KEY 환경변수가 설정되지 않아 DUMMY 키로 요청합니다. (bizinfo.go.kr에서 키 발급 필요)")

        params = {
            "crtfcKey": api_key or "DUMMY",
            "dataType": "json",
            "searchCnt": search_cnt,
        }

        try:
            print(f"[Bizinfo API]: 기업마당 공고 요청 시작 (요청 건수: {search_cnt}건, 타임아웃: 120초)...")
            async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as client:
                res = await client.get(url, params=params)
                
                if res.status_code == 200:
                    try:
                        data = res.json()
                        items = data.get("jsonArray", []) or data.get("items", [])
                        print(f"[Bizinfo API]: ✅ 성공적으로 {len(items)}건의 공고 데이터를 수신했습니다.")
                        return items
                    except Exception as json_err:
                        print(f"[Bizinfo API Error]: 📄 JSON 파싱 실패 (응답 본문 일부: {res.text[:200]}) - {json_err}")
                        return []
                else:
                    print(f"[Bizinfo API Error]: ❌ HTTP 상태 코드 {res.status_code} 반환 (응답 내용: {res.text[:200]})")
        except httpx.TimeoutException as e:
            print(f"[Bizinfo API Error]: ⏱️ 타임아웃 발생 (120초 초과) - {type(e).__name__}. 기업마당 서버의 응답이 너무 지연되었습니다.")
        except httpx.ConnectError as e:
            print(f"[Bizinfo API Error]: 🌐 서버 연결 실패 (ConnectError) - 기업마당 서버 주소에 연결할 수 없습니다: {e}")
        except Exception as e:
            print(f"[Bizinfo API Error]: ⚠️ 예외 발생 ({type(e).__name__}) - {e or '상세 메시지 없음'}")
        return []

    @staticmethod
    async def fetch_kstartup(limit: int = 0) -> list:
        """Fetch live notices from K-Startup OpenAPI (apis.data.go.kr & odcloud) with 120s timeout and clear error diagnostics."""
        api_key = settings.KSTARTUP_API_KEY
        num_rows = limit if (limit > 0 and limit <= 1000) else 500
        data_gokr_url = "https://apis.data.go.kr/B552735/kisedKstartupService01/getAnnouncementInformation01"
        odcloud_url = "https://api.odcloud.kr/api/15083299/v1/uddi:02bc6c67-6a1a-4648-b4b9-83c393bc3c42"

        if not api_key:
            print("[K-Startup API Warning]: ⚠️ KSTARTUP_API_KEY 환경변수가 설정되지 않았습니다. (data.go.kr에서 발급 필요)")

        results = []
        try:
            from urllib.parse import unquote
            # Decode key to prevent double URL-encoding by httpx
            keys_to_try = []
            if api_key:
                clean_decoded = unquote(api_key).strip()
                keys_to_try.append(clean_decoded)
                if clean_decoded != api_key:
                    keys_to_try.append(api_key)

            print(f"[K-Startup API]: K-Startup 공고 요청 시작 (요청 건수: {num_rows}건, 타임아웃: 120초)...")
            async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as client:
                # 1. Try standard apis.data.go.kr endpoint (XML/JSON)
                for key_attempt in keys_to_try:
                    try:
                        res = await client.get(
                            data_gokr_url,
                            params={
                                "serviceKey": key_attempt,
                                "page": 1,
                                "perPage": num_rows,
                                "pageNo": 1,
                                "numOfRows": num_rows,
                            }
                        )
                        if res.status_code == 200:
                            text_content = res.text
                            if "<results>" in text_content or "<item>" in text_content:
                                root = ET.fromstring(text_content)
                                for item_el in root.iter("item"):
                                    col_data = {}
                                    for col in item_el.findall("col"):
                                        name = col.get("name")
                                        if name:
                                            col_data[name] = (col.text or "").strip()
                                    if col_data:
                                        results.append(col_data)
                                if results:
                                    print(f"[K-Startup API]: ✅ apis.data.go.kr (XML)에서 {len(results)}건 수신 성공.")
                                    return results
                            elif "SERVICE_KEY_IS_NOT_REGISTERED_ERROR" in text_content:
                                print(f"[K-Startup API Info]: 키 ({key_attempt[:10]}...) 시도 중 SERVICE_KEY_IS_NOT_REGISTERED_ERROR 반환.")
                        else:
                            print(f"[K-Startup apis.data.go.kr]: HTTP {res.status_code} - {res.text[:200]}")
                    except Exception as e_xml:
                        print(f"[K-Startup apis.data.go.kr Error]: {type(e_xml).__name__} - {e_xml}")

                # 2. Fallback to odcloud if no results
                if not results:
                    params = {
                        "serviceKey": api_key or "DUMMY",
                        "page": 1,
                        "perPage": num_rows,
                    }
                    res = await client.get(odcloud_url, params=params)
                    if res.status_code == 200:
                        try:
                            data = res.json()
                            items = data.get("data", [])
                            print(f"[K-Startup API]: ✅ odcloud에서 {len(items)}건 공고 수신 성공.")
                            return items
                        except Exception as json_err:
                            print(f"[K-Startup odcloud JSON Error]: {json_err}")
                    else:
                        print(f"[K-Startup odcloud Error]: ❌ HTTP 상태 코드 {res.status_code} (응답 내용: {res.text[:200]})")
        except httpx.TimeoutException as e:
            print(f"[K-Startup API Error]: ⏱️ 타임아웃 발생 (120초 초과) - {type(e).__name__}. 공공데이터 포털 서버 응답 지연.")
        except httpx.ConnectError as e:
            print(f"[K-Startup API Error]: 🌐 서버 연결 실패 (ConnectError): {e}")
        except Exception as e:
            print(f"[K-Startup API Error]: ⚠️ 예외 발생 ({type(e).__name__}) - {e or '상세 메시지 없음'}")
        return results

    @classmethod
    async def run_pipeline(cls, limit_per_source: int = 0) -> int:
        print(f"\n[Crawler Pipeline]: 🚀 동시 수집 파이프라인 시작 (출처당 제한: {limit_per_source or '전체(최대 500건)'})...")
        
        # 1. Concurrently fetch both Bizinfo & K-Startup in parallel
        biz_res, kst_res = await asyncio.gather(
            cls.fetch_bizinfo(limit_per_source),
            cls.fetch_kstartup(limit_per_source),
            return_exceptions=True
        )

        biz_items = biz_res if isinstance(biz_res, list) else []
        kst_items = kst_res if isinstance(kst_res, list) else []

        if isinstance(biz_res, Exception):
            print(f"[Crawler Pipeline]: ⚠️ Bizinfo 예외 발생으로 0건 처리: {type(biz_res).__name__} - {biz_res}")
        if isinstance(kst_res, Exception):
            print(f"[Crawler Pipeline]: ⚠️ K-Startup 예외 발생으로 0건 처리: {type(kst_res).__name__} - {kst_res}")

        print(f"[Crawler Pipeline]: 📊 수집 결과 - 기업마당 {len(biz_items)}건, K-Startup {len(kst_items)}건 확보.")

        db = SessionLocal()
        try:
            # 2. Get existing external IDs
            result = db.execute(text('SELECT "externalId" FROM "SupportSource"'))
            existing_ids = {row[0] for row in result.fetchall()}

            new_count = 0

            # Helper for date parsing
            def parse_date(date_str: str | None) -> datetime | None:
                if not date_str:
                    return None
                cleaned = str(date_str).strip().replace(".", "-").replace("/", "-")
                if len(cleaned) == 8 and cleaned.isdigit():
                    cleaned = f"{cleaned[:4]}-{cleaned[4:6]}-{cleaned[6:]}"
                try:
                    if len(cleaned) >= 10:
                        return datetime.strptime(cleaned[:10], "%Y-%m-%d")
                except Exception:
                    pass
                return None

            # 3. Process Bizinfo Items
            biz_inserted = 0
            for item in biz_items:
                raw_id = str(item.get("pblancId", "")).strip()
                if not raw_id:
                    continue
                ext_id = f"BIZ_LIVE_{raw_id}" if not raw_id.startswith("BIZ_") else raw_id
                if ext_id in existing_ids or raw_id in existing_ids:
                    continue

                prog_id = str(uuid.uuid4())
                src_id = str(uuid.uuid4())
                title = item.get("pblancNm") or "기업마당 지원사업"
                organizer = item.get("jnsmAgencyNm") or item.get("jrsdInsttNm") or "중소벤처기업부"
                exec_agency = item.get("excInsttNm") or item.get("refrncNm") or None
                category = item.get("pblancPldirNm") or item.get("pldirSportRealmMlsfcCodeNm") or "사업화/기업지원"
                region = item.get("jrsdInsttNm") or "전국"
                if title.startswith("[") and "]" in title:
                    region = title[1:title.index("]")]
                target_desc = item.get("trgetNm") or item.get("hashtags") or "중소기업 및 소상공인"
                source_url = item.get("pblancUrl") or f"https://www.bizinfo.go.kr/sii/siia/selectSIIA200Detail.do?pblancId={raw_id}"

                # Dates
                start_date = None
                end_date = None
                date_range = item.get("reqstBeginEndDe", "")
                if "~" in str(date_range):
                    parts = str(date_range).split("~")
                    start_date = parse_date(parts[0])
                    end_date = parse_date(parts[1])

                db.execute(
                    text("""
                    INSERT INTO "SupportProgram" (
                        "id", "title", "organizer", "executingAgency", "category", "region",
                        "targetDescription", "startDate", "endDate", "duplicateStatus", "createdAt", "updatedAt"
                    )
                    VALUES (
                        :id, :title, :organizer, :executingAgency, :category, :region,
                        :targetDescription, :startDate, :endDate, 'UNIQUE', NOW(), NOW()
                    )
                    """),
                    {
                        "id": prog_id,
                        "title": title,
                        "organizer": organizer,
                        "executingAgency": exec_agency,
                        "category": category,
                        "region": region,
                        "targetDescription": target_desc,
                        "startDate": start_date,
                        "endDate": end_date,
                    }
                )

                db.execute(
                    text("""
                    INSERT INTO "SupportSource" (
                        "id", "supportProgramId", "sourceType", "externalId", "sourceUrl", "rawTitle", "rawData", "createdAt"
                    )
                    VALUES (
                        :id, :prog_id, 'BIZINFO', :ext_id, :url, :rawTitle, :rawData, NOW()
                    )
                    """),
                    {
                        "id": src_id,
                        "prog_id": prog_id,
                        "ext_id": ext_id,
                        "url": source_url,
                        "rawTitle": title,
                        "rawData": json.dumps(item, ensure_ascii=False),
                    }
                )

                # Attachments
                file_nm = item.get("fileNm")
                if file_nm:
                    for fname in str(file_nm).split("@"):
                        fname = fname.strip()
                        if fname:
                            ext = fname.split(".")[-1].upper() if "." in fname else "FILE"
                            db.execute(
                                text("""
                                INSERT INTO "SupportDocument" ("id", "supportProgramId", "fileName", "fileUrl", "fileType", "status", "createdAt", "updatedAt")
                                VALUES (:id, :prog_id, :fileName, :fileUrl, :fileType, 'PENDING', NOW(), NOW())
                                """),
                                {
                                    "id": str(uuid.uuid4()),
                                    "prog_id": prog_id,
                                    "fileName": fname,
                                    "fileUrl": source_url,
                                    "fileType": ext,
                                }
                            )

                existing_ids.add(ext_id)
                new_count += 1
                biz_inserted += 1

            # 4. Process K-Startup Items with Bizinfo-First Canonical Deduplication
            kst_inserted = 0
            kst_merged_to_biz = 0

            # Preload active programs for fast matching
            existing_programs_rows = db.execute(text('''
                SELECT id, title, "endDate"
                FROM "SupportProgram"
                WHERE "duplicateStatus" != 'MERGED'
            ''')).fetchall()

            existing_programs_list = [
                {"id": r[0], "title": r[1] or "", "endDate": r[2], "normTitle": normalize_title(r[1] or "")}
                for r in existing_programs_rows
            ]

            for item in kst_items:
                raw_sn = str(item.get("pbanc_sn") or item.get("prch_cnpl_no") or item.get("공고번호") or item.get("id") or "").strip()
                if not raw_sn:
                    continue
                ext_id = f"KST_LIVE_{raw_sn}" if not raw_sn.startswith("KST_") else raw_sn
                if ext_id in existing_ids or raw_sn in existing_ids:
                    continue

                title = (
                    item.get("biz_pbanc_nm")
                    or item.get("intg_pbanc_biz_nm")
                    or item.get("detl_pg_title")
                    or item.get("공고명")
                    or item.get("사업명")
                    or f"K-Startup 지원사업 {raw_sn}"
                )
                start_date = parse_date(item.get("pbanc_rcpt_bgng_dt") or item.get("접수시작일시"))
                end_date = parse_date(item.get("pbanc_rcpt_end_dt") or item.get("접수마감일시"))
                source_url = (
                    item.get("detl_pg_url")
                    or item.get("aply_mthd_onli_rcpt_istc")
                    or item.get("상세URL")
                    or "https://www.k-startup.go.kr"
                )

                # Check if this K-Startup notice matches an existing Bizinfo notice (Bizinfo-First Policy)
                kst_norm = normalize_title(title)
                matched_canonical_id = None

                if len(kst_norm) >= 3:
                    for prog in existing_programs_list:
                        b_norm = prog["normTitle"]
                        if not b_norm or len(b_norm) < 3:
                            continue
                        
                        # Match test
                        is_match = False
                        if kst_norm == b_norm:
                            is_match = True
                        elif kst_norm in b_norm or b_norm in kst_norm:
                            shorter = min(len(kst_norm), len(b_norm))
                            longer = max(len(kst_norm), len(b_norm))
                            if shorter / longer >= 0.7:
                                is_match = True
                        
                        if is_match and DedupService.is_date_compatible(prog["endDate"], end_date):
                            matched_canonical_id = prog["id"]
                            break

                src_id = str(uuid.uuid4())

                if matched_canonical_id:
                    # Duplicate found: DO NOT create new SupportProgram!
                    # Connect SupportSource to the canonical Bizinfo program instead.
                    db.execute(
                        text("""
                        INSERT INTO "SupportSource" (
                            "id", "supportProgramId", "sourceType", "externalId", "sourceUrl", "rawTitle", "rawData", "createdAt"
                        )
                        VALUES (
                            :id, :prog_id, 'K_STARTUP', :ext_id, :url, :rawTitle, :rawData, NOW()
                        )
                        """),
                        {
                            "id": src_id,
                            "prog_id": matched_canonical_id,
                            "ext_id": ext_id,
                            "url": source_url,
                            "rawTitle": title,
                            "rawData": json.dumps(item, ensure_ascii=False),
                        }
                    )
                    existing_ids.add(ext_id)
                    kst_merged_to_biz += 1
                else:
                    # Unique new notice: Insert both SupportProgram and SupportSource
                    prog_id = str(uuid.uuid4())
                    organizer = item.get("pbanc_ntrp_nm") or item.get("소관기관") or "중소벤처기업부"
                    exec_agency = item.get("exct_istt_nm") or item.get("수행기관") or "창업진흥원"
                    category = item.get("supt_biz_clsfc") or item.get("지원분야") or "창업/사업화"
                    region = item.get("supt_regin") or item.get("지역") or "전국"
                    target_desc = item.get("aply_trgt_ctnt") or item.get("biz_enyy") or item.get("지원대상") or "창업 7년 이내 기업 및 예비창업자"

                    db.execute(
                        text("""
                        INSERT INTO "SupportProgram" (
                            "id", "title", "organizer", "executingAgency", "category", "region",
                            "targetDescription", "startDate", "endDate", "duplicateStatus", "createdAt", "updatedAt"
                        )
                        VALUES (
                            :id, :title, :organizer, :executingAgency, :category, :region,
                            :targetDescription, :startDate, :endDate, 'UNIQUE', NOW(), NOW()
                        )
                        """),
                        {
                            "id": prog_id,
                            "title": title,
                            "organizer": organizer,
                            "executingAgency": exec_agency,
                            "category": category,
                            "region": region,
                            "targetDescription": target_desc,
                            "startDate": start_date,
                            "endDate": end_date,
                        }
                    )

                    db.execute(
                        text("""
                        INSERT INTO "SupportSource" (
                            "id", "supportProgramId", "sourceType", "externalId", "sourceUrl", "rawTitle", "rawData", "createdAt"
                        )
                        VALUES (
                            :id, :prog_id, 'K_STARTUP', :ext_id, :url, :rawTitle, :rawData, NOW()
                        )
                        """),
                        {
                            "id": src_id,
                            "prog_id": prog_id,
                            "ext_id": ext_id,
                            "url": source_url,
                            "rawTitle": title,
                            "rawData": json.dumps(item, ensure_ascii=False),
                        }
                    )

                    existing_programs_list.append({
                        "id": prog_id,
                        "title": title,
                        "endDate": end_date,
                        "normTitle": kst_norm
                    })
                    existing_ids.add(ext_id)
                    new_count += 1
                    kst_inserted += 1

            # 5. Log Crawl Result
            db.execute(
                text("""
                INSERT INTO "CrawlLog" ("id", "sourceType", "status", "itemCount", "executedAt")
                VALUES (:id, 'FASTAPI_COLLECTOR', 'SUCCESS', :count, NOW())
                """),
                {"id": str(uuid.uuid4()), "count": new_count}
            )
            db.commit()
            print(f"[Crawler Pipeline]: 🎉 DB 적재 완료 - 신규 저장: 총 {new_count}건 (기업마당: {biz_inserted}건, K-Startup 신규: {kst_inserted}건, K-Startup 중복 통합: {kst_merged_to_biz}건)")
            return new_count

        except Exception as e:
            db.rollback()
            print(f"[Crawler Pipeline DB Error]: ❌ 데이터베이스 트랜잭션 실패 - {type(e).__name__}: {e}")
            raise e
        finally:
            db.close()

crawler_service = CrawlerService()

