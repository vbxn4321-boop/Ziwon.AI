import asyncio
import httpx
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from app.services.crawler_service import crawler_service
from app.services.dedup_service import dedup_service

scheduler = AsyncIOScheduler()

async def scheduled_crawler_job():
    print("[SCHEDULER] ⏰ Triggering automated hourly crawler ingestion job...")
    try:
        new_count = await crawler_service.run_pipeline(0)
        print(f"[SCHEDULER] ✅ Hourly crawler completed: {new_count} new support notices ingested.")
    except Exception as e:
        print(f"[SCHEDULER] ❌ Crawler job failed: {e}")

async def scheduled_nightly_pre_scraping_job():
    """심야 시간대(03:30 KST) 또는 유휴 상태 시 미적재 공고 첨부파일 일괄 사전 스크래핑"""
    print("[SCHEDULER] 🌙 Starting scheduled nightly pre-scraping background job...")
    try:
        # Call frontend pre-scrape batch endpoint
        async with httpx.AsyncClient(timeout=120.0) as client:
            res = await client.post(
                "http://localhost:3000/api/admin/pre-scrape",
                json={"limit": 15},
            )
            if res.status_code == 200:
                data = res.json()
                print(f"[SCHEDULER] ✅ Nightly pre-scraping finished: {data.get('message')}")
            else:
                print(f"[SCHEDULER] ⚠️ Pre-scraping response {res.status_code}: {res.text[:200]}")
    except Exception as e:
        print(f"[SCHEDULER] ❌ Nightly pre-scraping job failed (Next.js server might be starting): {e}")

def start_scheduler():
    # 1. Run crawler every hour at :00 KST (Near-Realtime 24/7)
    scheduler.add_job(
        scheduled_crawler_job,
        trigger=CronTrigger(minute=0, timezone="Asia/Seoul"),
        id="hourly_crawler_job",
        replace_existing=True,
    )

    # 2. Run nightly pre-scraping batch at 03:30 KST (Low traffic window)
    scheduler.add_job(
        scheduled_nightly_pre_scraping_job,
        trigger=CronTrigger(hour=3, minute=30, timezone="Asia/Seoul"),
        id="nightly_pre_scraping_job",
        replace_existing=True,
    )

    scheduler.start()
    print("[SCHEDULER] 🚀 Background scheduler started (Hourly Crawler + 03:30 KST Nightly Pre-Scraping).")

def shutdown_scheduler():
    scheduler.shutdown()
    print("[SCHEDULER] Background scheduler stopped.")
