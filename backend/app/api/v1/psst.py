from fastapi import APIRouter, HTTPException
from app.schemas.psst import PsstGeneratorInput, PsstBusinessPlanResult, PsstChatRequest
from app.services.gemini_service import gemini_service

router = APIRouter()

@router.post("/generate", summary="Gemini 2.5 기반 표준 PSST 사업계획서 풀세트 생성")
async def generate_psst(input_data: PsstGeneratorInput):
    try:
        plan = await gemini_service.generate_psst_plan(input_data)
        return {
            "success": True,
            "plan": plan,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PSST Generation error: {str(e)}")

@router.post("/chat", summary="실시간 AI 컨설턴트 1:1 심층 인터뷰 챗봇")
async def chat_coach(req: PsstChatRequest):
    try:
        result = await gemini_service.chat_coach(
            messages=req.messages,
            target_program_title=req.targetProgramTitle or "2026년 초기창업패키지",
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PSST Chat error: {str(e)}")
