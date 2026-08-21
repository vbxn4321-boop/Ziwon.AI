import uuid
import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from app.core.database import SessionLocal
from app.core.security import get_current_user, AuthenticatedUser
from app.schemas.saved_plan import (
    SavedPsstPlanCreate,
    SavedPsstPlanUpdate,
    SavedPsstPlanListItem,
    SavedPsstPlanDetailResponse,
)

router = APIRouter()

@router.get("", response_model=List[SavedPsstPlanListItem], summary="내 저장된 PSST 사업계획서 목록 조회")
def list_my_plans(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        query = text("""
            SELECT "id", "userId", "title", "targetProgramTitle", "supportProgramId", "score", "grade", "createdAt", "updatedAt"
            FROM "SavedPsstPlan"
            WHERE "userId" = :user_id
            ORDER BY "updatedAt" DESC
        """)
        rows = db.execute(query, {"user_id": current_user.id}).fetchall()
        return [
            SavedPsstPlanListItem(
                id=r[0],
                userId=r[1],
                title=r[2],
                targetProgramTitle=r[3],
                supportProgramId=r[4],
                score=r[5],
                grade=r[6],
                createdAt=r[7],
                updatedAt=r[8],
            )
            for r in rows
        ]
    finally:
        db.close()

@router.post("", response_model=SavedPsstPlanDetailResponse, summary="새 PSST 사업계획서 저장")
def create_saved_plan(
    input_data: SavedPsstPlanCreate,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        plan_id = str(uuid.uuid4())
        plan_str = (
            json.dumps(input_data.planJson, ensure_ascii=False)
            if not isinstance(input_data.planJson, str)
            else input_data.planJson
        )

        query = text("""
            INSERT INTO "SavedPsstPlan" (
                "id", "userId", "title", "targetProgramTitle", "supportProgramId",
                "planJson", "score", "grade", "createdAt", "updatedAt"
            ) VALUES (
                :id, :user_id, :title, :targetProgramTitle, :supportProgramId,
                :planJson, :score, :grade, NOW(), NOW()
            )
        """)
        db.execute(query, {
            "id": plan_id,
            "user_id": current_user.id,
            "title": input_data.title,
            "targetProgramTitle": input_data.targetProgramTitle,
            "supportProgramId": input_data.supportProgramId,
            "planJson": plan_str,
            "score": input_data.score,
            "grade": input_data.grade,
        })
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"사업계획서 저장 실패: {str(e)}")
    finally:
        db.close()

    return get_saved_plan(plan_id=plan_id, current_user=current_user)

@router.get("/{plan_id}", response_model=SavedPsstPlanDetailResponse, summary="특정 사업계획서 상세 조회")
def get_saved_plan(
    plan_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        query = text("""
            SELECT "id", "userId", "title", "targetProgramTitle", "supportProgramId", "planJson", "score", "grade", "createdAt", "updatedAt"
            FROM "SavedPsstPlan"
            WHERE "id" = :id AND "userId" = :user_id
        """)
        row = db.execute(query, {"id": plan_id, "user_id": current_user.id}).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="사업계획서를 찾을 수 없습니다.")

        parsed_json = row[5]
        try:
            if isinstance(parsed_json, str):
                parsed_json = json.loads(parsed_json)
        except Exception:
            pass

        return SavedPsstPlanDetailResponse(
            id=row[0],
            userId=row[1],
            title=row[2],
            targetProgramTitle=row[3],
            supportProgramId=row[4],
            planJson=parsed_json,
            score=row[6],
            grade=row[7],
            createdAt=row[8],
            updatedAt=row[9],
        )
    finally:
        db.close()

@router.put("/{plan_id}", response_model=SavedPsstPlanDetailResponse, summary="저장된 사업계획서 수정")
def update_saved_plan(
    plan_id: str,
    input_data: SavedPsstPlanUpdate,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    # Verify ownership
    get_saved_plan(plan_id=plan_id, current_user=current_user)

    db = SessionLocal()
    try:
        updates = []
        params = {"id": plan_id, "user_id": current_user.id}

        if input_data.title is not None:
            updates.append('"title" = :title')
            params["title"] = input_data.title

        if input_data.planJson is not None:
            plan_str = (
                json.dumps(input_data.planJson, ensure_ascii=False)
                if not isinstance(input_data.planJson, str)
                else input_data.planJson
            )
            updates.append('"planJson" = :planJson')
            params["planJson"] = plan_str

        if input_data.score is not None:
            updates.append('"score" = :score')
            params["score"] = input_data.score

        if input_data.grade is not None:
            updates.append('"grade" = :grade')
            params["grade"] = input_data.grade

        updates.append('"updatedAt" = NOW()')

        update_query = text(f"""
            UPDATE "SavedPsstPlan"
            SET {", ".join(updates)}
            WHERE "id" = :id AND "userId" = :user_id
        """)
        db.execute(update_query, params)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"사업계획서 수정 실패: {str(e)}")
    finally:
        db.close()

    return get_saved_plan(plan_id=plan_id, current_user=current_user)

@router.delete("/{plan_id}", summary="사업계획서 삭제")
def delete_saved_plan(
    plan_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    # Verify ownership
    get_saved_plan(plan_id=plan_id, current_user=current_user)

    db = SessionLocal()
    try:
        db.execute(
            text('DELETE FROM "SavedPsstPlan" WHERE "id" = :id AND "userId" = :user_id'),
            {"id": plan_id, "user_id": current_user.id}
        )
        db.commit()
        return {"success": True, "message": "사업계획서가 성공적으로 삭제되었습니다."}
    finally:
        db.close()
