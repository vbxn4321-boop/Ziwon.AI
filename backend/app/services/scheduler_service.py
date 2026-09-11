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
    print("[SCHEDULER] ⏰ 자동 매시간 크롤러 수집 작업을 시작합니다...")
    try:
        new_count = await crawler_service.run_pipeline(0)
        print(f"[SCHEDULER] ✅ 매시간 크롤러 완료: 신규 지원사업 공고 {new_count}건 적재.")
    except Exception as e:
        print(f"[SCHEDULER] ❌ 크롤러 작업 실패: {e}")

async def scheduled_pre_scraping_job():
    """매시 30분마다 미적재/손상 공고 첨부파일을 20건씩 사전 스크래핑·재적재 (파이썬 네이티브 직접 실행)

    크롤러가 매시 정각에 새 공고를 넣으므로, 그 30분 뒤에 돌려 같은 시간대에
    막 들어온 뼈대 문서까지 바로 처리 대상에 잡히게 한다.
    """
    print("[SCHEDULER] ⏰ 예약된 사전 스크래핑 백그라운드 작업을 시작합니다 (파이썬 네이티브 엔진)...")
    try:
        result = await scraper_service.run_pre_scraping_batch(limit=20)
        print(f"[SCHEDULER] ✅ 사전 스크래핑 완료: {result.get('message')}")
    except Exception as e:
        print(f"[SCHEDULER] ❌ 사전 스크래핑 작업 실패: {e}")

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
    print("[SCHEDULER] 🚀 백그라운드 스케줄러가 시작되었습니다 (매시 정각 크롤러 + 매시 30분 사전 스크래핑, 회당 20건).")

def shutdown_scheduler():
    scheduler.shutdown()
    print("[SCHEDULER] 백그라운드 스케줄러가 중지되었습니다.")
