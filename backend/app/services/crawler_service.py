import uuid
import json
import httpx
from datetime import datetime
from sqlalchemy import text
from app.core.database import SessionLocal
from app.core.config import settings

class CrawlerService:
    @staticmethod
    async def fetch_bizinfo(limit: int = 0) -> list:
        # Fetch notices from Bizinfo open API
        url = "https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do"
        params = {
            "crtfcKey": settings.BIZINFO_API_KEY or "DUMMY",
            "dataType": "json",
            "searchCnt": limit if limit > 0 else 100,
        }
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                res = await client.get(url, params=params)
                if res.status_code == 200:
                    data = res.json()
                    return data.get("jsonArray", [])
        except Exception as e:
            print(f"[Bizinfo API Error]: {e}")
        return []

    @staticmethod
    async def fetch_kstartup(limit: int = 0) -> list:
        # Fetch notices from K-Startup open API
        url = "https://api.odcloud.kr/api/15083299/v1/uddi:02bc6c67-6a1a-4648-b4b9-83c393bc3c42"
        params = {
            "serviceKey": settings.KSTARTUP_API_KEY or "DUMMY",
            "page": 1,
            "perPage": limit if limit > 0 else 100,
        }
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                res = await client.get(url, params=params)
                if res.status_code == 200:
                    data = res.json()
                    return data.get("data", [])
        except Exception as e:
            print(f"[K-Startup API Error]: {e}")
        return []

    @classmethod
    async def run_pipeline(cls, limit_per_source: int = 0) -> int:
        db = SessionLocal()
        try:
            # 1. Fetch from APIs
            biz_items = await cls.fetch_bizinfo(limit_per_source)
            kst_items = await cls.fetch_kstartup(limit_per_source)
            
            # 2. Get existing external IDs
            result = db.execute(text('SELECT "externalId" FROM "SupportSource"'))
            existing_ids = {row[0] for row in result.fetchall()}
            
            new_count = 0
            # Process Bizinfo
            for item in biz_items:
                ext_id = str(item.get("pblancId", ""))
                if not ext_id or ext_id in existing_ids:
                    continue
                
                prog_id = str(uuid.uuid4())
                src_id = str(uuid.uuid4())
                title = item.get("pblancNm", "제목 없음")
                organizer = item.get("jrsdInsttNm", "주관기관 미지정")
                category = item.get("pldirSportRealmMlsfcCodeNm", "기타")
                region = item.get("jrsdInsttNm", "전국")
                
                db.execute(
                    text("""
                    INSERT INTO "SupportProgram" ("id", "title", "organizer", "category", "region", "duplicateStatus", "createdAt", "updatedAt")
                    VALUES (:id, :title, :organizer, :category, :region, 'UNIQUE', NOW(), NOW())
                    """),
                    {"id": prog_id, "title": title, "organizer": organizer, "category": category, "region": region}
                )
                
                db.execute(
                    text("""
                    INSERT INTO "SupportSource" ("id", "supportProgramId", "sourceType", "externalId", "sourceUrl", "rawTitle", "rawData", "createdAt")
                    VALUES (:id, :prog_id, 'BIZINFO', :ext_id, :url, :rawTitle, :rawData, NOW())
                    """),
                    {
                        "id": src_id,
                        "prog_id": prog_id,
                        "ext_id": ext_id,
                        "url": item.get("pblancUrl", ""),
                        "rawTitle": title,
                        "rawData": json.dumps(item, ensure_ascii=False),
                    }
                )
                existing_ids.add(ext_id)
                new_count += 1

            # Log Crawl
            db.execute(
                text("""
                INSERT INTO "CrawlLog" ("id", "sourceType", "status", "itemCount", "executedAt")
                VALUES (:id, 'FASTAPI_COLLECTOR', 'SUCCESS', :count, NOW())
                """),
                {"id": str(uuid.uuid4()), "count": new_count}
            )
            db.commit()
            return new_count
        except Exception as e:
            db.rollback()
            print(f"[Crawler Pipeline Error]: {e}")
            raise e
        finally:
            db.close()

crawler_service = CrawlerService()
