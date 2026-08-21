from datetime import datetime
from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.schemas.crawler import CrawlerTriggerRequest, CrawlerTriggerResponse
from app.services.crawler_service import crawler_service

router = APIRouter()

@router.post("/run", response_model=CrawlerTriggerResponse, summary="공고 크롤러 즉시 수동 실행")
async def run_crawler(req: CrawlerTriggerRequest = CrawlerTriggerRequest()):
    try:
        new_count = await crawler_service.run_pipeline(req.limitPerSource)
        return CrawlerTriggerResponse(
            success=True,
            message="크롤링 및 Supabase DB 적재가 성공적으로 완료되었습니다.",
            newNoticesIngested=new_count,
            executedAt=datetime.now().isoformat(),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Crawler error: {str(e)}")
