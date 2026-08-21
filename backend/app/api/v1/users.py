from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from app.core.database import SessionLocal
from app.core.security import get_current_user, AuthenticatedUser
from app.schemas.user import UserProfileResponse

router = APIRouter()

@router.get("/me", response_model=UserProfileResponse, summary="현재 로그인된 사용자 프로필 조회")
def get_my_profile(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        row = db.execute(
            text('SELECT "id", "email", "name", "role", "createdAt" FROM "User" WHERE "id" = :id'),
            {"id": current_user.id}
        ).fetchone()

        if not row:
            db.execute(
                text("""
                INSERT INTO "User" ("id", "email", "name", "role", "createdAt", "updatedAt")
                VALUES (:id, :email, :name, 'USER', NOW(), NOW())
                ON CONFLICT ("id") DO NOTHING
                """),
                {"id": current_user.id, "email": current_user.email, "name": current_user.name}
            )
            db.commit()
            row = db.execute(
                text('SELECT "id", "email", "name", "role", "createdAt" FROM "User" WHERE "id" = :id'),
                {"id": current_user.id}
            ).fetchone()

        return UserProfileResponse(
            id=row[0],
            email=row[1],
            name=row[2],
            role=row[3] or "USER",
            createdAt=row[4],
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"사용자 프로필 조회 실패: {str(e)}")
    finally:
        db.close()
