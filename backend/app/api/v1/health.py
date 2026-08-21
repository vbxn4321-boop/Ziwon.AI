from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db

router = APIRouter()

@router.get("/health", summary="서버 헬스체크 및 DB 연결 상태 확인")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy ({str(e)})"

    return {
        "status": "ok",
        "service": "Ziwon.AI FastAPI Core Engine",
        "database": db_status,
    }
