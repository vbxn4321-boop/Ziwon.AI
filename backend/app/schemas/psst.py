from pydantic import BaseModel, Field
from typing import List, Optional

class PsstOverviewSummaryTable(BaseModel):
    itemCategory: str
    targetUsers: str
    coreFeature: str
    monetization: str
    targetBudget: str

class PsstOverview(BaseModel):
    title: str
    companyName: str
    industry: str
    itemSummary: str
    summaryTable: Optional[PsstOverviewSummaryTable] = None

class PsstTamSamSom(BaseModel):
    tam: str
    sam: str
    som: str

class PsstProblem(BaseModel):
    title: str
    marketPainPoint: str
    targetCustomerProblem: str
    tamSamSom: Optional[PsstTamSamSom] = None
    developmentNecessity: str

class PsstCompetitorRow(BaseModel):
    category: str
    ourItem: str
    competitorA: str
    competitorB: str

class PsstRoadmapRow(BaseModel):
    quarter: str
    milestone: str
    keyActivities: str
    output: str

class PsstSolution(BaseModel):
    title: str
    coreTechnologyAndFeatures: str
    competitorDifferentiation: str
    competitorTable: Optional[List[PsstCompetitorRow]] = None
    implementationPlan: str
    roadmapTable: Optional[List[PsstRoadmapRow]] = None

class PsstBudgetRow(BaseModel):
    category: str
    amount: str
    ratio: int
    description: str

class PsstScaleUp(BaseModel):
    title: str
    businessModelAndRevenue: str
    marketEntryAndMarketing: str
    fundingAndBudgetPlan: str
    budgetTable: Optional[List[PsstBudgetRow]] = None

class PsstTeamMember(BaseModel):
    role: str
    nameOrAlias: str
    competency: str
    mainTask: str

class PsstTeam(BaseModel):
    title: str
    founderAndTeamCompetency: str
    memberList: Optional[List[PsstTeamMember]] = None
    rolesAndResponsibilities: str
    collaborationNetwork: str

class PsstRubricBreakdown(BaseModel):
    problemScore: int
    problemFeedback: str
    solutionScore: int
    solutionFeedback: str
    scaleUpScore: int
    scaleUpFeedback: str
    teamScore: int
    teamFeedback: str

class PsstQuestion(BaseModel):
    question: str
    evaluationIntent: str
    recommendedDefense: str

class PsstEvaluationReport(BaseModel):
    score: int
    grade: str
    gradeDescription: str
    breakdown: Optional[PsstRubricBreakdown] = None
    strengths: List[str]
    weaknesses: List[str]
    expectedQuestions: List[PsstQuestion]

class PsstBusinessPlanResult(BaseModel):
    overview: PsstOverview
    problem: PsstProblem
    solution: PsstSolution
    scaleUp: PsstScaleUp
    team: PsstTeam
    evaluationReport: PsstEvaluationReport

class PsstGeneratorInput(BaseModel):
    companyName: str = Field(default="예비창업기업")
    itemName: str
    industry: str
    targetCustomer: Optional[str] = ""
    itemDescription: str
    coreStrengths: Optional[str] = ""
    targetProgramTitle: Optional[str] = "2026년 초기창업패키지"
    budget: Optional[str] = ""

class PsstChatRequest(BaseModel):
    messages: List[dict]
    targetProgramTitle: Optional[str] = "2026년 중소벤처기업부 초기창업패키지"
    currentPlan: Optional[PsstBusinessPlanResult] = None
