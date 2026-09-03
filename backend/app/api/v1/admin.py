from fastapi import APIRouter, HTTPException
from app.services.dedup_service import dedup_service
from app.services.crawler_service import crawler_service

router = APIRouter()

@router.get("/dedup/candidates")
def get_dedup_candidates():
    """탐색된 기업마당 vs K-Startup 중복 후보 목록 반환"""
    try:
        pairs = dedup_service.find_duplicate_pairs()
        return {
            "success": True,
            "count": len(pairs),
            "candidates": pairs,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/dedup/merge")
def execute_dedup_merge():
    """중복 공고를 기업마당 대표 공고로 일괄 통합 병합 실행"""
    try:
        results = dedup_service.merge_duplicates()
        return {
            "success": True,
            "message": f"성공적으로 {len(results)}건의 중복 공고를 통합했습니다.",
            "mergedCount": len(results),
            "results": results,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/crawler/run")
async def trigger_crawler_pipeline():
    """크롤러 파이프라인 수동 즉시 실행"""
    try:
        new_count = await crawler_service.run_pipeline(0)
        return {
            "success": True,
            "message": f"크롤러 실행 완료: {new_count}건의 신규 공고 수집/적재 완료",
            "newCount": new_count,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
