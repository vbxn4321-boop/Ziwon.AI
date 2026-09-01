import json
from google import genai
from google.genai import types
from app.core.config import settings
from app.schemas.psst import PsstGeneratorInput, PsstBusinessPlanResult

import os

# Official Google Gemini Latest Supported Model Lineup (3.7 Flash & 3.x First)
DEFAULT_MODELS = [
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-pro-preview",
    "gemini-2.5-pro",
    "gemini-flash-latest",
    "gemini-2.0-flash",
]

env_model = os.getenv("AI_GENERAL_MODEL")
CANDIDATE_MODELS = [env_model] + [m for m in DEFAULT_MODELS if m != env_model] if env_model else DEFAULT_MODELS

class GeminiService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.client = genai.Client(api_key=self.api_key) if self.api_key else None

    async def generate_psst_plan(self, input_data: PsstGeneratorInput) -> dict:
        if not self.client:
            raise ValueError("GEMINI_API_KEY is not configured.")

        system_instruction = """
        당신은 대한민국 중소벤처기업부 및 창업진흥원 공인 표준 PSST 사업계획서 최고 권위자이자 전문 심사위원(Evaluation Lead)입니다.
        사용자가 입력한 정보를 기반으로 100점 만점 기준을 통과하는 완벽한 PSST 사업계획서 전문 및 심사위원 평가 리포트를 완성하십시오.
        반드시 엄격한 JSON 구조로 응답하십시오.
        """

        user_prompt = f"""
        [목표 지원사업 서식]: {input_data.targetProgramTitle}
        [기업명/대표자]: {input_data.companyName}
        [창업 아이템명]: {input_data.itemName}
        [산업 분야]: {input_data.industry}
        [예산 규모]: {input_data.budget}
        [타겟 고객]: {input_data.targetCustomer}
        [사업 내용 & 개발 필요성]: {input_data.itemDescription}
        [핵심 기술 및 차별화 강점]: {input_data.coreStrengths}

        반드시 다음 구조의 JSON만 출력하십시오:
        {{
          "overview": {{ "title": "아이템명", "companyName": "기업명", "industry": "산업", "itemSummary": "요약", "summaryTable": {{ "itemCategory": "분야", "targetUsers": "타겟", "coreFeature": "기능", "monetization": "수익모델", "targetBudget": "예산" }} }},
          "problem": {{ "title": "1. 문제인식", "marketPainPoint": "고통", "targetCustomerProblem": "고객문제", "developmentNecessity": "필요성", "tamSamSom": {{ "tam": "전체", "sam": "유효", "som": "수익" }} }},
          "solution": {{ "title": "2. 실현가능성", "coreTechnologyAndFeatures": "기술", "competitorDifferentiation": "차별성", "implementationPlan": "계획", "competitorTable": [], "roadmapTable": [] }},
          "scaleUp": {{ "title": "3. 성장전략", "businessModelAndRevenue": "BM", "marketEntryAndMarketing": "마케팅", "fundingAndBudgetPlan": "자금계획", "budgetTable": [] }},
          "team": {{ "title": "4. 팀구성", "founderAndTeamCompetency": "역량", "rolesAndResponsibilities": "역할", "collaborationNetwork": "네트워크", "memberList": [] }},
          "evaluationReport": {{ "score": 88, "grade": "A", "gradeDescription": "우수", "strengths": [], "weaknesses": [], "improvementRecommendations": [], "expectedQuestions": [] }}
        }}
        """

        last_error = None
        for model_name in CANDIDATE_MODELS:
            try:
                print(f"[GeminiService] Attempting latest model: {model_name}...")
                response = self.client.models.generate_content(
                    model=model_name,
                    contents=user_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type="application/json",
                        temperature=0.3,
                    ),
                )
                if response.text:
                    print(f"✅ [GeminiService] Succeeded with latest model: {model_name}")
                    return json.loads(response.text)
            except Exception as e:
                last_error = e
                print(f"[GeminiService] Model {model_name} failed: {e}")

        raise last_error or ValueError("All Gemini models failed.")

    async def chat_coach(self, messages: list, target_program_title: str) -> dict:
        if not self.client:
            raise ValueError("GEMINI_API_KEY is not configured.")

        system_instruction = f"""
        당신은 {target_program_title} 전담 전문 창업 컨설턴트입니다.
        사용자의 창업 아이디어를 경청하고, PSST 5단계(1.아이템 2.문제인식 3.실현기술 4.BM 5.팀역량)를 인터뷰하여 완성도 높은 답변을 이끌어내십시오.
        답변 끝에 사용자가 누를 수 있는 3개의 퀵 답변 제안을 다음 형식으로 달아주십시오:
        <<<SUGGESTIONS>>>
        ["제안1", "제안2", "제안3"]
        """

        contents = []
        for m in messages:
            contents.append(f"{m.get('role', 'user')}: {m.get('content', '')}")

        last_error = None
        for model_name in CANDIDATE_MODELS:
            try:
                response = self.client.models.generate_content(
                    model=model_name,
                    contents="\n".join(contents),
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=0.7,
                    ),
                )
                text = response.text
                if text:
                    suggestions = []
                    if "<<<SUGGESTIONS>>>" in text:
                        parts = text.split("<<<SUGGESTIONS>>>")
                        reply = parts[0].strip()
                        try:
                            suggestions = json.loads(parts[1].strip())
                        except Exception:
                            suggestions = ["기술 사양 구체화", "타겟 시장 규모 분석", "수익 모델 검증"]
                    else:
                        reply = text.strip()

                    return {
                        "success": True,
                        "reply": reply,
                        "suggestions": suggestions,
                    }
            except Exception as e:
                last_error = e

        raise last_error or ValueError("All Gemini models failed.")

gemini_service = GeminiService()
