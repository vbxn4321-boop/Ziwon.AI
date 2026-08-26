import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from app.services.crawler_service import crawler_service

scheduler = AsyncIOScheduler()

async def scheduled_crawler_job():
    print("[SCHEDULER] ⏰ Triggering automated hourly crawler ingestion job...")
    try:
        new_count = await crawler_service.run_pipeline(0)
        print(f"[SCHEDULER] ✅ Hourly crawler completed: {new_count} new support notices ingested.")
    except Exception as e:
        print(f"[SCHEDULER] ❌ Crawler job failed: {e}")

def start_scheduler():
    # Run every hour at :00 KST (Near-Realtime 24/7)
    scheduler.add_job(
        scheduled_crawler_job,
        trigger=CronTrigger(minute=0, timezone="Asia/Seoul"),
        id="hourly_crawler_job",
        replace_existing=True,
    )
    scheduler.start()
    print("[SCHEDULER] 🚀 Background scheduler started (Near-Realtime: Every hour at :00 KST).")

def shutdown_scheduler():
    scheduler.shutdown()
    print("[SCHEDULER] Background scheduler stopped.")

