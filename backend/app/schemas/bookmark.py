from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class BookmarkToggleResponse(BaseModel):
    success: bool
    bookmarked: bool
    message: str

class BookmarkListItem(BaseModel):
    id: str
    supportProgramId: str
    programTitle: str
    organizer: str
    category: str
    region: str
    endDate: Optional[datetime] = None
    createdAt: datetime
