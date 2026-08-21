from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserProfileResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    role: str = "USER"
    createdAt: Optional[datetime] = None
