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
            print(f"[Python Scraper] 🔍 공고 웹페이지 요청 중: {source_url}")
            res = await client.get(source_url, headers={"User-Agent": USER_AGENT})
            if res.status_code != 200:
                print(f"[Python Scraper] ⚠️ 웹페이지 요청 실패 {source_url} (HTTP {res.status_code})")
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
                print(f"[Python Scraper] ↪️ K-Startup JS 리다이렉트를 따라갑니다: {redirect_url}")
                try:
                    redir_res = await client.get(redirect_url, headers={"User-Agent": USER_AGENT})
                    if redir_res.status_code == 200:
                        html = redir_res.text
                except Exception as e:
                    print(f"[Python Scraper] 리다이렉트 처리 경고: {e}")

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

            # 이 함수는 공고의 첨부파일 목록을 완전히 새로 채운다. 기존에 남아있던
            # (특히 손상되어 재시도 대상이 된) SupportDocument 행을 먼저 지워야
            # 재실행할 때마다 중복이 쌓이지 않는다. DocumentChunk 는 FK CASCADE 로
            # 함께 삭제된다.
            if candidate_entries:
                db = SessionLocal()
                try:
                    db.execute(
                        text('DELETE FROM "SupportDocument" WHERE "supportProgramId" = :prog_id'),
                        {"prog_id": support_program_id},
                    )
                    db.commit()
                finally:
                    db.close()

            # Download and parse up to 10 attachments
            for entry in candidate_entries[:10]:
                try:
                    print(f"[Python Scraper] ⬇️ 첨부파일 다운로드 중: {entry['url']}")
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
                    ext_match = re.search(r"\.(pdf|hwpx|hwp|docx|zip)", f"{final_filename} {entry['url']}", re.IGNORECASE)
                    if ext_match:
                        file_type = ext_match.group(1).upper()
                    elif buf[:4] == b"%PDF":
                        file_type = "PDF"
                        final_filename += ".pdf"
                    elif buf[:4] == b"\xd0\xcf\x11\xe0":
                        file_type = "HWP"
                        final_filename += ".hwp"
                    elif buf[:2] == b"PK":
                        if parser_service.is_regular_zip(buf):
                            file_type = "ZIP"
                            final_filename += ".zip"
                        else:
                            file_type = "HWPX"
                            final_filename += ".hwpx"

                    if "." not in final_filename:
                        final_filename = f"{final_filename}.{file_type.lower()}"

                    # Handle ZIP archive: Extract and store all internal documents individually
                    if file_type == "ZIP" or parser_service.is_regular_zip(buf):
                        zip_docs = parser_service.extract_and_parse_zip(buf)
                        if zip_docs:
                            db = SessionLocal()
                            try:
                                for zdoc in zip_docs:
                                    sub_doc_id = str(uuid.uuid4())
                                    sub_filename = sanitize_utf8(zdoc["fileName"])
                                    sub_text = sanitize_utf8(zdoc.get("extractedText", ""))
                                    sub_type = zdoc.get("fileType", "FILE")
                                    # 압축 내부 경로. fileUrl 은 부모 ZIP 을 가리키고, 이 값으로
                                    # 다운로드 프록시(extractZipEntry)가 개별 파일만 꺼내 준다.
                                    sub_entry_path = zdoc.get("entryPath")
                                    sub_status = "PARSED" if sub_text and len(sub_text) > 50 else "PENDING"

                                    db.execute(
                                        text("""
                                        INSERT INTO "SupportDocument" (
                                            "id", "supportProgramId", "fileName", "fileUrl", "entryPath", "fileType",
                                            "extractedText", "status", "createdAt", "updatedAt"
                                        )
                                        VALUES (
                                            :id, :prog_id, :fileName, :fileUrl, :entryPath, :fileType,
                                            :extractedText, :status, NOW(), NOW()
                                        )
                                        """),
                                        {
                                            "id": sub_doc_id,
                                            "prog_id": support_program_id,
                                            "fileName": sub_filename,
                                            "fileUrl": entry["url"],
                                            "entryPath": sub_entry_path,
                                            "fileType": sub_type,
                                            "extractedText": sub_text,
                                            "status": sub_status,
                                        }
                                    )
                                    scraped_docs.append({
                                        "id": sub_doc_id,
                                        "fileName": sub_filename,
                                        "fileType": sub_type,
                                        "textLength": len(sub_text)
                                    })
                                    print(f"[Python Scraper] 📦 [ZIP 추출] ✅ '{sub_filename}' 저장 완료 ({sub_type}, {len(sub_text)}자, status={sub_status})")
                                db.commit()
                            finally:
                                db.close()
                            continue  # Handled all zip contents

                    # Extract text for single document using parser_service
                    extracted_text = ""
                    try:
                        if file_type == "PDF":
                            extracted_text = parser_service.parse_pdf(buf)
                        elif file_type == "HWPX":
                            extracted_text = parser_service.parse_hwpx(buf)
                        elif file_type == "HWP":
                            extracted_text = parser_service.parse_hwp5(buf)
                        elif file_type == "ZIP" or buf[:2] == b"PK":
                            # 위에서 압축 해제가 이미 실패했으므로(zip_docs 가 비어 여기까지 옴)
                            # 원본 ZIP 바이트를 그대로 utf-8 디코딩하면 의미 없는 쓰레기 텍스트가
                            # 나온다. 빈 텍스트로 남겨 PENDING 상태로 재시도 대상이 되게 한다.
                            extracted_text = ""
                        else:
                            extracted_text = buf.decode("utf-8", errors="ignore")
                    except Exception as parse_err:
                        print(f"[Python Scraper] {final_filename} 파싱 경고: {parse_err}")

                    clean_filename = sanitize_utf8(final_filename)
                    clean_text = sanitize_utf8(extracted_text)

                    # Save to database
                    doc_id = str(uuid.uuid4())

                    # status 는 스키마가 정의한 PENDING / PARSED / FAILED 만 사용해야 합니다.
                    # 본문 추출에 성공했으면 PARSED, 아니면 PENDING 으로 두어 재처리되게 합니다.
                    doc_status = "PARSED" if clean_text and len(clean_text) > 50 else "PENDING"

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
                                :extractedText, :status, NOW(), NOW()
                            )
                            """),
                            {
                                "id": doc_id,
                                "prog_id": support_program_id,
                                "fileName": clean_filename,
                                "fileUrl": entry["url"],
                                "fileType": file_type,
                                "extractedText": clean_text,
                                "status": doc_status,
                            }
                        )
                        db.commit()
                        scraped_docs.append({
                            "id": doc_id,
                            "fileName": clean_filename,
                            "fileType": file_type,
                            "textLength": len(clean_text)
                        })
                        print(f"[Python Scraper] ✅ '{clean_filename}' 저장 완료 ({file_type}, {len(clean_text)}자, status={doc_status})")
                    finally:
                        db.close()

                except Exception as dl_err:
                    print(f"[Python Scraper] {entry['url']} 다운로드 실패: {dl_err}")

            # 이 페이지에서 첨부파일을 하나도 못 건졌으면(링크 자체가 없었거나,
            # 링크는 있었지만 전부 다운로드 실패) "확인은 했다" 표시를 남긴다.
            # TS 쪽 scrapeMissingAttachments 와 동일한 규칙이다. 이게 없으면
            # 첨부가 원래 없는 공고(온라인 접수형 등)가 문서 0건 조건에 계속
            # 걸려 매 회차마다 원문 사이트를 다시 긁게 된다.
            if not scraped_docs:
                db = SessionLocal()
                try:
                    # candidate_entries 가 있었을 때만 위에서 이미 지웠으므로,
                    # 없었던 경우(옛 손상 행이 남아있을 수 있음)를 대비해 한 번 더 지운다.
                    db.execute(
                        text('DELETE FROM "SupportDocument" WHERE "supportProgramId" = :prog_id'),
                        {"prog_id": support_program_id},
                    )
                    notice_only_id = str(uuid.uuid4())
                    db.execute(
                        text("""
                        INSERT INTO "SupportDocument" (
                            "id", "supportProgramId", "fileName", "fileUrl", "fileType",
                            "extractedText", "status", "createdAt", "updatedAt"
                        )
                        VALUES (
                            :id, :prog_id, :fileName, :fileUrl, 'NOTICE_ONLY',
                            :extractedText, 'PARSED', NOW(), NOW()
                        )
                        """),
                        {
                            "id": notice_only_id,
                            "prog_id": support_program_id,
                            "fileName": "[온라인 신청 공고] 별도 서식 파일 없음 (원문 웹페이지 직접 접수)",
                            "fileUrl": source_url,
                            "extractedText": "본 공고는 별도의 HWP/PDF 서식 파일이 제공되지 않으며, 원문 웹페이지의 온라인 신청 폼 또는 접수처 링크를 통해 직접 신청하는 지원사업입니다.",
                        },
                    )
                    db.commit()
                    print(f"[Python Scraper] ℹ️ 첨부파일을 찾지 못했습니다. NOTICE_ONLY 로 기록하여 재시도 대상에서 제외합니다: {source_url}")
                finally:
                    db.close()

        except Exception as e:
            print(f"[Python Scraper] ❌ {source_url} 스크래핑 중 예외 발생: {e}")
        finally:
            if should_close_client:
                await client.aclose()

        return scraped_docs

    @classmethod
    async def run_pre_scraping_batch(cls, limit: int = 15) -> Dict[str, Any]:
        """
        Run nightly background batch to scrape missing attachments for active support notices directly from Python.

        두 부류를 함께 대상으로 삼는다:
        1. 첨부파일 행이 아예 없는 공고 (원래 조건)
        2. 크롤러가 뼈대 행만 만들어두고, 압축을 못 풀거나 아직 처리되지 않아
           손상 상태로 남아있는 공고 (.zip 이 entryPath 없이 본문도 비어있거나,
           과거 버그로 .zip.hwpx 로 잘못 저장된 행)

        2번이 없으면, 크롤러가 넣은 뼈대 행 때문에 "documents 0개" 조건이 다시는
        참이 되지 않아 새로 수집되는 압축파일은 영원히 이 배치에서 빠지게 된다.
        """
        print(f"\n[Scraper Batch]: 🌙 파이썬 네이티브 사전 스크래핑 백그라운드 작업 시작 (목표 한도: {limit}건)...")
        try:
            return await cls._run_pre_scraping_batch_inner(limit)
        except Exception as e:
            # 이 배치는 CrawlLog 에 실행 이력을 남기지 않아서, 실제로 도는지 조용히
            # 실패하는지 지금까지 DB 로는 전혀 확인할 방법이 없었다. 예외가 나도
            # 반드시 CrawlLog 에 흔적을 남기고, 스케줄러에는 항상 dict 를 돌려준다.
            print(f"[Scraper Batch] ❌ 배치 전체 실패: {e}")
            cls._write_crawl_log("PYTHON_PRE_SCRAPE_BATCH", "FAILED", 0, str(e))
            return {
                "success": False,
                "message": f"사전 스크래핑 배치 실행 중 오류: {e}",
                "processed_count": 0,
                "results": []
            }

    @staticmethod
    def _write_crawl_log(source_type: str, status: str, item_count: int, error_message: Optional[str] = None):
        """이 배치의 실행 이력을 CrawlLog 에 남긴다. 관리자 페이지/DB 조회로
        실제 실행 여부와 결과를 나중에도 확인할 수 있게 하기 위함이다."""
        db = SessionLocal()
        try:
            db.execute(
                text("""
                INSERT INTO "CrawlLog" ("id", "sourceType", "status", "itemCount", "errorMessage", "executedAt")
                VALUES (:id, :source_type, :status, :item_count, :error_message, NOW())
                """),
                {
                    "id": str(uuid.uuid4()),
                    "source_type": source_type,
                    "status": status,
                    "item_count": item_count,
                    "error_message": error_message,
                },
            )
            db.commit()
        except Exception as log_err:
            print(f"[Scraper Batch] CrawlLog 기록 실패 (무시하고 계속): {log_err}")
        finally:
            db.close()

    @classmethod
    async def _run_pre_scraping_batch_inner(cls, limit: int) -> Dict[str, Any]:
        # 항상 "최신순"으로만 뽑으면, 매시간 새로 들어오는(그리고 실제로 첨부파일이
        # 없는 이벤트성 공고 등도 섞인) 신규 항목이 계속 앞자리를 차지해서 오래된
        # 진짜 밀린 공고는 순서가 영원히 안 온다. 절반은 오래된 것부터(백로그 소진),
        # 절반은 최신 것부터(신규 공고 신속 처리) 나눠 뽑는다.
        where_clause = """
            (sp."endDate" IS NULL OR sp."endDate" >= CURRENT_DATE)
            AND ss."sourceUrl" IS NOT NULL
            AND (
              NOT EXISTS (
                SELECT 1 FROM "SupportDocument" sd
                WHERE sd."supportProgramId" = sp.id
              )
              OR EXISTS (
                SELECT 1 FROM "SupportDocument" sd2
                WHERE sd2."supportProgramId" = sp.id
                  AND (
                    sd2."fileName" ILIKE '%.zip.hwpx'
                    OR (
                      sd2."fileName" ILIKE '%.zip'
                      AND sd2."entryPath" IS NULL
                      AND (sd2."extractedText" IS NULL OR sd2."extractedText" = '')
                    )
                  )
              )
            )
        """
        oldest_limit = limit // 2
        newest_limit = limit - oldest_limit

        db = SessionLocal()
        try:
            oldest_rows = db.execute(
                text(f"""
                SELECT sp.id, sp.title, ss."sourceUrl", ss."sourceType"
                FROM "SupportProgram" sp
                JOIN "SupportSource" ss ON sp.id = ss."supportProgramId"
                WHERE {where_clause}
                ORDER BY sp."createdAt" ASC
                LIMIT :limit
                """),
                {"limit": oldest_limit}
            ).fetchall()

            already_picked = {r[0] for r in oldest_rows}
            newest_rows_raw = db.execute(
                text(f"""
                SELECT sp.id, sp.title, ss."sourceUrl", ss."sourceType"
                FROM "SupportProgram" sp
                JOIN "SupportSource" ss ON sp.id = ss."supportProgramId"
                WHERE {where_clause}
                ORDER BY sp."createdAt" DESC
                LIMIT :limit
                """),
                {"limit": newest_limit + len(already_picked)}
            ).fetchall()
            # 백로그 몫과 겹치는 공고는 중복 처리하지 않는다
            newest_rows = [r for r in newest_rows_raw if r[0] not in already_picked][:newest_limit]

            rows = list(oldest_rows) + newest_rows
            print(f"[Scraper Batch]: 📋 백로그(오래된 순) {len(oldest_rows)}건 + 신규(최신 순) {len(newest_rows)}건 선정")
        finally:
            db.close()

        if not rows:
            print("[Scraper Batch]: ✅ 모든 활성 공고의 첨부파일이 이미 정상 적재되어 있습니다.")
            cls._write_crawl_log("PYTHON_PRE_SCRAPE_BATCH", "SUCCESS", 0, "처리 대상 없음")
            return {
                "success": True,
                "message": "사전 적재/재적재가 필요한 공고가 없습니다. 모든 활성 공고가 이미 처리되었습니다.",
                "processed_count": 0,
                "results": []
            }

        print(f"[Scraper Batch]: 🎯 사전 스크래핑/재적재가 필요한 활성 공고 {len(rows)}건을 찾았습니다.")
        results = []

        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            for idx, (prog_id, title, source_url, source_type) in enumerate(rows):
                print(f"[Scraper Batch] ({idx + 1}/{len(rows)}) '{title}' 처리 중...")
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
                    print(f"[Scraper Batch 오류] {prog_id} 처리 실패: {err}")
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
        print(f"[Scraper Batch 완료]: 🚀 {summary_msg}\n")
        cls._write_crawl_log(
            "PYTHON_PRE_SCRAPE_BATCH",
            "SUCCESS" if failed_count < len(rows) else "FAILED",
            success_count,
            summary_msg,
        )

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
