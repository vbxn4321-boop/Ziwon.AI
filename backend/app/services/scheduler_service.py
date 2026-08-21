import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from app.services.crawler_service import crawler_service

scheduler = AsyncIOScheduler()

async def scheduled_crawler_job():
    print("[SCHEDULER] Triggering automated daily crawler ingestion job...")
    try:
        new_count = await crawler_service.run_pipeline(0)
        print(f"[SCHEDULER] Successfully ingested {new_count} new support notices.")
    except Exception as e:
        print(f"[SCHEDULER] Crawler job failed: {e}")

def start_scheduler():
    # Run everyday at 04:00 KST (19:00 UTC)
    scheduler.add_job(
        scheduled_crawler_job,
        trigger=CronTrigger(hour=4, minute=0, timezone="Asia/Seoul"),
        id="daily_crawler_job",
        replace_existing=True,
    )
    scheduler.start()
    print("[SCHEDULER] Background scheduler started (Daily 04:00 KST).")

def shutdown_scheduler():
    scheduler.shutdown()
    print("[SCHEDULER] Background scheduler stopped.")
