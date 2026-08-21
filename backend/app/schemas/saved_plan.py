from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

class SavedPsstPlanCreate(BaseModel):
    title: str
    targetProgramTitle: Optional[str] = None
    supportProgramId: Optional[str] = None
    planJson: Any  # Dict or JSON string
    score: Optional[int] = None
    grade: Optional[str] = None

class SavedPsstPlanUpdate(BaseModel):
    title: Optional[str] = None
    planJson: Optional[Any] = None
    score: Optional[int] = None
    grade: Optional[str] = None

class SavedPsstPlanListItem(BaseModel):
    id: str
    userId: str
    title: str
    targetProgramTitle: Optional[str] = None
    supportProgramId: Optional[str] = None
    score: Optional[int] = None
    grade: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime

class SavedPsstPlanDetailResponse(BaseModel):
    id: str
    userId: str
    title: str
    targetProgramTitle: Optional[str] = None
    supportProgramId: Optional[str] = None
    planJson: Any
    score: Optional[int] = None
    grade: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime
