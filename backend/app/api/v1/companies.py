import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from app.core.database import SessionLocal
from app.core.security import get_current_user, AuthenticatedUser
from app.schemas.company import CompanyProfileInput, CompanyProfileResponse

router = APIRouter()

@router.get("/me", response_model=CompanyProfileResponse, summary="현재 로그인된 사용자의 대표 기업 프로필 조회")
def get_my_company(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        query = text("""
            SELECT c."id", c."name", c."bizRegNo", c."industry", c."region", c."foundedDate",
                   c."revenue", c."employeeCount", c."isExporting", c."hasPatents",
                   c."hasCertifications", c."coreItemSummary", c."createdAt", c."updatedAt"
            FROM "Company" c
            INNER JOIN "UserCompany" uc ON c."id" = uc."companyId"
            WHERE uc."userId" = :user_id
            ORDER BY c."updatedAt" DESC
            LIMIT 1
        """)
        row = db.execute(query, {"user_id": current_user.id}).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="등록된 기업 프로필이 없습니다.")

        return CompanyProfileResponse(
            id=row[0],
            name=row[1],
            bizRegNo=row[2],
            industry=row[3],
            region=row[4],
            foundedDate=row[5],
            revenue=float(row[6]) if row[6] is not None else None,
            employeeCount=row[7] or 1,
            isExporting=bool(row[8]),
            hasPatents=bool(row[9]),
            hasCertifications=bool(row[10]),
            coreItemSummary=row[11],
            createdAt=row[12],
            updatedAt=row[13],
        )
    finally:
        db.close()

@router.post("/me", response_model=CompanyProfileResponse, summary="내 기업 프로필 등록 또는 갱신")
def save_my_company(
    input_data: CompanyProfileInput,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        check_q = text("""
            SELECT c."id" FROM "Company" c
            INNER JOIN "UserCompany" uc ON c."id" = uc."companyId"
            WHERE uc."userId" = :user_id
            LIMIT 1
        """)
        existing = db.execute(check_q, {"user_id": current_user.id}).fetchone()

        founded_dt = None
        if input_data.foundedDate:
            try:
                founded_dt = datetime.fromisoformat(input_data.foundedDate)
            except Exception:
                founded_dt = None

        if existing:
            company_id = existing[0]
            update_q = text("""
                UPDATE "Company"
                SET "name" = :name, "bizRegNo" = :bizRegNo, "industry" = :industry,
                    "region" = :region, "foundedDate" = :foundedDate, "revenue" = :revenue,
                    "employeeCount" = :employeeCount, "isExporting" = :isExporting,
                    "hasPatents" = :hasPatents, "hasCertifications" = :hasCertifications,
                    "coreItemSummary" = :coreItemSummary, "updatedAt" = NOW()
                WHERE "id" = :id
            """)
            db.execute(update_q, {
                "id": company_id,
                "name": input_data.name,
                "bizRegNo": input_data.bizRegNo,
                "industry": input_data.industry,
                "region": input_data.region,
                "foundedDate": founded_dt,
                "revenue": input_data.revenue,
                "employeeCount": input_data.employeeCount,
                "isExporting": input_data.isExporting,
                "hasPatents": input_data.hasPatents,
                "hasCertifications": input_data.hasCertifications,
                "coreItemSummary": input_data.coreItemSummary,
            })
        else:
            company_id = str(uuid.uuid4())
            insert_c = text("""
                INSERT INTO "Company" (
                    "id", "name", "bizRegNo", "industry", "region", "foundedDate",
                    "revenue", "employeeCount", "isExporting", "hasPatents",
                    "hasCertifications", "coreItemSummary", "createdAt", "updatedAt"
                ) VALUES (
                    :id, :name, :bizRegNo, :industry, :region, :foundedDate,
                    :revenue, :employeeCount, :isExporting, :hasPatents,
                    :hasCertifications, :coreItemSummary, NOW(), NOW()
                )
            """)
            db.execute(insert_c, {
                "id": company_id,
                "name": input_data.name,
                "bizRegNo": input_data.bizRegNo,
                "industry": input_data.industry,
                "region": input_data.region,
                "foundedDate": founded_dt,
                "revenue": input_data.revenue,
                "employeeCount": input_data.employeeCount,
                "isExporting": input_data.isExporting,
                "hasPatents": input_data.hasPatents,
                "hasCertifications": input_data.hasCertifications,
                "coreItemSummary": input_data.coreItemSummary,
            })

            uc_id = str(uuid.uuid4())
            db.execute(
                text('INSERT INTO "UserCompany" ("id", "userId", "companyId", "createdAt") VALUES (:id, :userId, :companyId, NOW())'),
                {"id": uc_id, "userId": current_user.id, "companyId": company_id}
            )

        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"기업 정보 저장 실패: {str(e)}")
    finally:
        db.close()

    return get_my_company(current_user=current_user)
