import sys
import re
import io
import uuid
import asyncio
import urllib.parse
from datetime import datetime
from typing import List, Dict, Any, Optional
import httpx
from sqlalchemy import text
from app.core.database import SessionLocal
from app.services.parser_service import parser_service

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

def sanitize_utf8(text_val: Optional[str]) -> str:
    """Sanitize text to remove null bytes and invalid characters for Postgres"""
    if not text_val:
        return ""
    # Remove null bytes \x00 which Postgres text columns reject
    return text_val.replace("\x00", "").strip()

def decode_filename(content_disposition: str, fallback_name: str) -> str:
    """Robustly decode attachment filename from Content-Disposition header supporting UTF-8 and EUC-KR"""
    if not content_disposition:
        return fallback_name

    # Check filename*=UTF-8''... pattern
    fn_star = re.search(r"filename\*=UTF-8''([^;]+)", content_disposition, re.IGNORECASE)
    if fn_star:
        try:
            return urllib.parse.unquote(fn_star.group(1)).replace("+", " ").strip()
        except Exception:
            pass

    # Check standard filename="..."
    fn_match = re.search(r'filename="?([^";]+)"?', content_disposition, re.IGNORECASE)
    if fn_match:
        raw = fn_match.group(1).strip()
        if "%" in raw:
            try:
                return urllib.parse.unquote(raw).replace("+", " ").strip()
            except Exception:
                pass
        # Try Latin1 -> EUC-KR (Common in Korean government portals)
        try:
            raw_bytes = raw.encode("latin1")
            decoded = raw_bytes.decode("euc-kr")
            if decoded and len(decoded) > 2 and "\ufffd" not in decoded:
                return decoded.strip()
        except Exception:
            pass
        return raw

    return fallback_name

class ScraperService:
    @staticmethod
    async def scrape_missing_attachments(
        support_program_id: str,
        source_url: str,
        client: Optional[httpx.AsyncClient] = None
    ) -> List[Dict[str, Any]]:
        """
        Dynamically scrape actual binary attachment files from Bizinfo / K-Startup notice webpages,
        download binaries, extract text, and save into SupportDocument.
        """
        if not source_url or not source_url.startswith("http"):
            return []

        should_close_client = False
        if client is None:
            client = httpx.AsyncClient(timeout=30.0, follow_redirects=True)
            should_close_client = True

        scraped_docs: List[Dict[str, Any]] = []

        try:
            print(f"[Python Scraper] 🔍 Fetching notice webpage: {source_url}")
            res = await client.get(source_url, headers={"User-Agent": USER_AGENT})
            if res.status_code != 200:
                print(f"[Python Scraper] ⚠️ Failed to fetch webpage {source_url} (HTTP {res.status_code})")
                return []

            html = res.text
            parsed_url = urllib.parse.urlparse(source_url)
            origin = f"{parsed_url.scheme}://{parsed_url.netloc}"

            def to_abs_url(path: str) -> str:
                clean = path.replace("&amp;", "&").strip()
                if clean.startswith("http://") or clean.startswith("https://"):
                    return clean
                if clean.startswith("/"):
                    return f"{origin}{clean}"
                return f"{origin}/{clean}"

            # 1. Handle K-Startup client-side JS redirect (var fullUrl = '...')
            js_redirect = re.search(r"var\s+fullUrl\s*=\s*['\"]([^'\"]+)['\"]", html, re.IGNORECASE)
            if js_redirect and js_redirect.group(1):
                redirect_url = to_abs_url(js_redirect.group(1))
                print(f"[Python Scraper] ↪️ Following K-Startup JS redirect to: {redirect_url}")
                try:
                    redir_res = await client.get(redirect_url, headers={"User-Agent": USER_AGENT})
                    if redir_res.status_code == 200:
                        html = redir_res.text
                except Exception as e:
                    print(f"[Python Scraper] Warning on redirect: {e}")

            candidate_entries: List[Dict[str, str]] = []

            # 2. Match K-Startup board_file list items (<a class="file_bg" title="...">...</a>)
            kst_items = re.findall(r'<li[^>]*class=["\'][^"\']*clear[^"\']*["\'][^>]*>([\s\S]*?)</li>', html, re.IGNORECASE)
            for item_html in kst_items:
                dl_match = re.search(r'href=["\']([^"\']*(?:/afile/fileDownload/[a-zA-Z0-9_-]+|fileDown\.do[^"\']*))["\']', item_html, re.IGNORECASE)
                if dl_match:
                    raw_href = to_abs_url(dl_match.group(1))
                    title_match = re.search(r'class=["\'][^"\']*file_bg[^"\']*["\'][^>]*title=["\'](?:\[첨부파일\]\s*)?([^"\']+)["\']', item_html, re.IGNORECASE) or \
                                  re.search(r'class=["\'][^"\']*file_bg[^"\']*["\'][^>]*>([\s\S]*?)</a>', item_html, re.IGNORECASE)
                    file_name = re.sub(r'<[^>]+>', '', title_match.group(1)).replace("[첨부파일]", "").strip() if title_match else "K-Startup_첨부서식"
                    if not any(c["url"] == raw_href for c in candidate_entries):
                        candidate_entries.append({"url": raw_href, "fallback_name": file_name})

            # 3. Match direct /afile/fileDownload/ URLs
            afile_matches = re.findall(r'href=["\']([^"\']*/afile/fileDownload/[a-zA-Z0-9_-]+)["\']', html, re.IGNORECASE)
            for raw_path in afile_matches:
                raw_href = to_abs_url(raw_path)
                if not any(c["url"] == raw_href for c in candidate_entries):
                    candidate_entries.append({"url": raw_href, "fallback_name": "K-Startup_공고_첨부파일"})

            # 4. Match fileBlank('path', 'name') patterns
            file_blank_matches = re.findall(r'fileBlank\(\s*[\'"]([^\'"]+)[\'"]\s*,\s*[\'"]([^\'"]+)[\'"]\s*\)', html, re.IGNORECASE)
            for raw_path, raw_name in file_blank_matches:
                raw_href = to_abs_url(raw_path)
                clean_name = raw_name.strip() or "공고문_첨부파일"
                if not any(c["url"] == raw_href for c in candidate_entries):
                    candidate_entries.append({"url": raw_href, "fallback_name": clean_name})

            # 5. Match K-Startup fn_fileDown('atchFileId', 'fileSn') patterns
            fn_down_matches = re.findall(r'(?:fn_fileDown|cmm_fileDown|fileDown|fn_download)\s*\(\s*[\'"]([^\'"]+)[\'"]\s*,\s*[\'"]([^\'"]+)[\'"]\s*\)', html, re.IGNORECASE)
            for atch_id, file_sn in fn_down_matches:
                dl_url = f"{origin}/common/file/FileDown.do?atchFileId={urllib.parse.quote(atch_id)}&fileSn={urllib.parse.quote(file_sn)}"
                if not any(c["url"] == dl_url for c in candidate_entries):
                    candidate_entries.append({"url": dl_url, "fallback_name": f"K-Startup_첨부서식_{file_sn}"})

            # 6. Match general download links (<a href="...fileDown.do..." ...>)
            link_matches = re.findall(r'<a[^>]*href=["\']([^"\']*(?:fileDown\.do|FileDown\.do|download\.do|downloadFile|\.pdf|\.hwp|\.hwpx|\.docx)[^"\']*)["\'][^>]*>([\s\S]*?)</a>', html, re.IGNORECASE)
            for raw_path, inner_text in link_matches:
                raw_href = to_abs_url(raw_path)
                clean_text = re.sub(r'<[^>]+>', '', inner_text).strip()
                cand_name = clean_text or "공고문_첨부파일"
                if not any(c["url"] == raw_href for c in candidate_entries):
                    candidate_entries.append({"url": raw_href, "fallback_name": cand_name})

            # Sort: Prioritize official document formats (PDF, HWP, HWPX, DOCX)
            def doc_priority(entry: Dict[str, str]) -> int:
                target = f"{entry['fallback_name']} {entry['url']}".lower()
                if any(ext in target for ext in [".pdf", ".hwp", ".hwpx", ".docx"]):
                    return 0
                return 1

            candidate_entries.sort(key=doc_priority)

            # Download and parse up to 10 attachments
            for entry in candidate_entries[:10]:
                try:
                    print(f"[Python Scraper] ⬇️ Downloading attachment: {entry['url']}")
                    bin_res = await client.get(
                        entry["url"],
                        headers={
                            "User-Agent": USER_AGENT,
                            "Referer": source_url,
                        },
                        timeout=30.0
                    )
                    if bin_res.status_code != 200 or len(bin_res.content) < 50:
                        continue

                    buf = bin_res.content
                    if b"<html" in buf[:200].lower() or b"<!doctype" in buf[:200].lower():
                        continue

                    # Decode real filename
                    cd_header = bin_res.headers.get("content-disposition", "")
                    final_filename = decode_filename(cd_header, entry["fallback_name"])
                    final_filename = re.sub(r"^\[(?:첨부파일|붙임)\]\s*", "", final_filename, flags=re.IGNORECASE).strip()

                    # Determine file type & extension
                    file_type = "FILE"
                    ext_match = re.search(r"\.(pdf|hwpx|hwp|docx)", f"{final_filename} {entry['url']}", re.IGNORECASE)
                    if ext_match:
                        file_type = ext_match.group(1).upper()
                    elif buf[:4] == b"%PDF":
                        file_type = "PDF"
                        final_filename += ".pdf"
                    elif buf[:2] == b"PK":
                        file_type = "HWPX"
                        final_filename += ".hwpx"
                    elif buf[:4] == b"\xd0\xcf\x11\xe0":
                        file_type = "HWP"
                        final_filename += ".hwp"

                    if "." not in final_filename:
                        final_filename = f"{final_filename}.{file_type.lower()}"

                    # Extract text using parser_service
                    extracted_text = ""
                    try:
                        if file_type == "PDF":
                            extracted_text = parser_service.parse_pdf(buf)
                        elif file_type == "HWPX":
                            extracted_text = parser_service.parse_hwpx(buf)
                        elif file_type == "HWP":
                            extracted_text = parser_service.parse_hwp5(buf)
                        else:
                            extracted_text = buf.decode("utf-8", errors="ignore")
                    except Exception as parse_err:
                        print(f"[Python Scraper] Parser warning for {final_filename}: {parse_err}")

                    clean_filename = sanitize_utf8(final_filename)
                    clean_text = sanitize_utf8(extracted_text)

                    # Save to database
                    doc_id = str(uuid.uuid4())
                    db = SessionLocal()
                    try:
                        db.execute(
                            text("""
                            INSERT INTO "SupportDocument" (
                                "id", "supportProgramId", "fileName", "fileUrl", "fileType",
                                "extractedText", "status", "createdAt", "updatedAt"
                            )
                            VALUES (
                                :id, :prog_id, :fileName, :fileUrl, :fileType,
                                :extractedText, 'READY', NOW(), NOW()
                            )
                            """),
                            {
                                "id": doc_id,
                                "prog_id": support_program_id,
                                "fileName": clean_filename,
                                "fileUrl": entry["url"],
                                "fileType": file_type,
                                "extractedText": clean_text,
                            }
                        )
                        db.commit()
                        scraped_docs.append({
                            "id": doc_id,
                            "fileName": clean_filename,
                            "fileType": file_type,
                            "textLength": len(clean_text)
                        })
                        print(f"[Python Scraper] ✅ Saved '{clean_filename}' ({file_type}, {len(clean_text)} chars)")
                    finally:
                        db.close()

                except Exception as dl_err:
                    print(f"[Python Scraper] Failed to download {entry['url']}: {dl_err}")

        except Exception as e:
            print(f"[Python Scraper] ❌ Exception scraping {source_url}: {e}")
        finally:
            if should_close_client:
                await client.aclose()

        return scraped_docs

    @classmethod
    async def run_pre_scraping_batch(cls, limit: int = 15) -> Dict[str, Any]:
        """
        Run nightly background batch to scrape missing attachments for active support notices directly from Python.
        """
        print(f"\n[Scraper Batch]: 🌙 Starting Python native pre-scraping background job (Target limit: {limit} programs)...")
        db = SessionLocal()
        try:
            # Query active programs that have sources but no documents yet
            rows = db.execute(
                text("""
                SELECT sp.id, sp.title, ss."sourceUrl", ss."sourceType"
                FROM "SupportProgram" sp
                JOIN "SupportSource" ss ON sp.id = ss."supportProgramId"
                LEFT JOIN "SupportDocument" sd ON sp.id = sd."supportProgramId"
                WHERE (sp."endDate" IS NULL OR sp."endDate" >= CURRENT_DATE)
                  AND sd.id IS NULL
                  AND ss."sourceUrl" IS NOT NULL
                ORDER BY sp."createdAt" DESC
                LIMIT :limit
                """),
                {"limit": limit}
            ).fetchall()
        finally:
            db.close()

        if not rows:
            print("[Scraper Batch]: ✅ 모든 활성 공고의 첨부파일이 이미 적재되어 있습니다.")
            return {
                "success": True,
                "message": "사전 적재가 필요한 공고가 없습니다. 모든 활성 공고가 이미 처리되었습니다.",
                "processed_count": 0,
                "results": []
            }

        print(f"[Scraper Batch]: 🎯 Found {len(rows)} active programs needing attachment pre-scraping.")
        results = []

        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            for idx, (prog_id, title, source_url, source_type) in enumerate(rows):
                print(f"[Scraper Batch] ({idx + 1}/{len(rows)}) Processing '{title}'...")
                try:
                    docs = await cls.scrape_missing_attachments(prog_id, source_url, client=client)
                    results.append({
                        "id": prog_id,
                        "title": title,
                        "status": "SUCCESS" if docs else "NO_DOCS_FOUND",
                        "doc_count": len(docs),
                        "files": [d["fileName"] for d in docs]
                    })
                except Exception as err:
                    print(f"[Scraper Batch Error] Failed for {prog_id}: {err}")
                    results.append({
                        "id": prog_id,
                        "title": title,
                        "status": "FAILED",
                        "error": str(err),
                        "doc_count": 0
                    })

                # Respectful rate limiting: 1s between notices
                if idx < len(rows) - 1:
                    await asyncio.sleep(1.0)

        success_count = sum(1 for r in results if r["status"] == "SUCCESS")
        no_doc_count = sum(1 for r in results if r["status"] == "NO_DOCS_FOUND")
        failed_count = sum(1 for r in results if r["status"] == "FAILED")

        summary_msg = f"총 {len(rows)}건 처리 ➔ {success_count}건 서식 적재 완료 (첨부없음: {no_doc_count}건, 오류: {failed_count}건)"
        print(f"[Scraper Batch Completed]: 🚀 {summary_msg}\n")

        return {
            "success": True,
            "message": summary_msg,
            "processed_count": len(rows),
            "success_count": success_count,
            "no_doc_count": no_doc_count,
            "failed_count": failed_count,
            "results": results
        }

scraper_service = ScraperService()
