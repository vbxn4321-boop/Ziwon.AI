import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from app.core.database import SessionLocal
from app.core.security import get_current_user, AuthenticatedUser
from app.schemas.bookmark import BookmarkListItem, BookmarkToggleResponse

router = APIRouter()

@router.get("", response_model=List[BookmarkListItem], summary="내 관심 공고(북마크) 목록 조회")
def list_my_bookmarks(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        query = text("""
            SELECT b."id", b."supportProgramId", sp."title", sp."organizer",
                   sp."category", sp."region", sp."endDate", b."createdAt"
            FROM "BookmarkedProgram" b
            INNER JOIN "SupportProgram" sp ON b."supportProgramId" = sp."id"
            WHERE b."userId" = :user_id
            ORDER BY b."createdAt" DESC
        """)
        rows = db.execute(query, {"user_id": current_user.id}).fetchall()
        return [
            BookmarkListItem(
                id=r[0],
                supportProgramId=r[1],
                programTitle=r[2],
                organizer=r[3],
                category=r[4],
                region=r[5],
                endDate=r[6],
                createdAt=r[7],
            )
            for r in rows
        ]
    finally:
        db.close()

@router.post("/{program_id}/toggle", response_model=BookmarkToggleResponse, summary="공고 북마크(찜) 토글")
def toggle_bookmark(
    program_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        check_q = text("""
            SELECT "id" FROM "BookmarkedProgram"
            WHERE "userId" = :user_id AND "supportProgramId" = :program_id
        """)
        existing = db.execute(check_q, {"user_id": current_user.id, "program_id": program_id}).fetchone()

        if existing:
            db.execute(
                text('DELETE FROM "BookmarkedProgram" WHERE "id" = :id'),
                {"id": existing[0]}
            )
            db.commit()
            return BookmarkToggleResponse(
                success=True,
                bookmarked=False,
                message="관심 공고에서 삭제되었습니다.",
            )
        else:
            bm_id = str(uuid.uuid4())
            db.execute(
                text("""
                INSERT INTO "BookmarkedProgram" ("id", "userId", "supportProgramId", "createdAt")
                VALUES (:id, :user_id, :program_id, NOW())
                """),
                {"id": bm_id, "user_id": current_user.id, "program_id": program_id}
            )
            db.commit()
            return BookmarkToggleResponse(
                success=True,
                bookmarked=True,
                message="관심 공고에 저장되었습니다.",
            )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"북마크 처리 실패: {str(e)}")
    finally:
        db.close()
