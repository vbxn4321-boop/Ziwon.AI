from pydantic import BaseModel
from typing import Optional, List

class CrawlerTriggerRequest(BaseModel):
    limitPerSource: int = 0  # 0 means all notices

class CrawlerTriggerResponse(BaseModel):
    success: bool
    message: str
    newNoticesIngested: int
    executedAt: str
