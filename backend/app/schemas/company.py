from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CompanyProfileInput(BaseModel):
    name: str
    bizRegNo: Optional[str] = None
    industry: Optional[str] = None
    region: str = "전국"
    foundedDate: Optional[str] = None
    revenue: Optional[float] = None
    employeeCount: int = 1
    isExporting: bool = False
    hasPatents: bool = False
    hasCertifications: bool = False
    coreItemSummary: Optional[str] = None

class CompanyProfileResponse(BaseModel):
    id: str
    name: str
    bizRegNo: Optional[str] = None
    industry: Optional[str] = None
    region: str
    foundedDate: Optional[datetime] = None
    revenue: Optional[float] = None
    employeeCount: int
    isExporting: bool
    hasPatents: bool
    hasCertifications: bool
    coreItemSummary: Optional[str] = None
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None
