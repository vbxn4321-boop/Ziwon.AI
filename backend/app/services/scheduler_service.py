import os
import asyncio
import httpx
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from app.services.crawler_service import crawler_service
from app.services.dedup_service import dedup_service
from app.services.scraper_service import scraper_service

scheduler = AsyncIOScheduler()

async def scheduled_crawler_job():
    print("[SCHEDULER] ⏰ Triggering automated hourly crawler ingestion job...")
    try:
        new_count = await crawler_service.run_pipeline(0)
        print(f"[SCHEDULER] ✅ Hourly crawler completed: {new_count} new support notices ingested.")
    except Exception as e:
        print(f"[SCHEDULER] ❌ Crawler job failed: {e}")

async def scheduled_pre_scraping_job():
    """매시 30분마다 미적재/손상 공고 첨부파일을 20건씩 사전 스크래핑·재적재 (파이썬 네이티브 직접 실행)

    크롤러가 매시 정각에 새 공고를 넣으므로, 그 30분 뒤에 돌려 같은 시간대에
    막 들어온 뼈대 문서까지 바로 처리 대상에 잡히게 한다.
    """
    print("[SCHEDULER] ⏰ Starting scheduled pre-scraping background job (Python Native Engine)...")
    try:
        result = await scraper_service.run_pre_scraping_batch(limit=20)
        print(f"[SCHEDULER] ✅ Pre-scraping completed: {result.get('message')}")
    except Exception as e:
        print(f"[SCHEDULER] ❌ Pre-scraping job failed: {e}")

def start_scheduler():
    # 1. Run crawler every hour at :00 KST (Near-Realtime 24/7)
    scheduler.add_job(
        scheduled_crawler_job,
        trigger=CronTrigger(minute=0, timezone="Asia/Seoul"),
        id="hourly_crawler_job",
        replace_existing=True,
    )

    # 2. Run pre-scraping/reprocessing batch every hour at :30 KST (20 items/run)
    scheduler.add_job(
        scheduled_pre_scraping_job,
        trigger=CronTrigger(minute=30, timezone="Asia/Seoul"),
        id="hourly_pre_scraping_job",
        replace_existing=True,
    )

    scheduler.start()
    print("[SCHEDULER] 🚀 Background scheduler started (Hourly Crawler @:00 + Hourly Pre-Scraping @:30, 20 items/run).")

def shutdown_scheduler():
    scheduler.shutdown()
    print("[SCHEDULER] Background scheduler stopped.")
