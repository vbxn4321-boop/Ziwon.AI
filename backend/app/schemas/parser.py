from pydantic import BaseModel
from typing import Optional

class ParserRequest(BaseModel):
    fileUrl: str
    fileType: str  # HWP, HWPX, PDF

class ParserResponse(BaseModel):
    success: bool
    fileName: Optional[str] = ""
    fileType: str
    extractedText: str
    characterCount: int
    error: Optional[str] = None
