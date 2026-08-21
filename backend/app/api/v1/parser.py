from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from app.schemas.parser import ParserRequest, ParserResponse
from app.services.parser_service import parser_service

router = APIRouter()

@router.post("/url", response_model=ParserResponse, summary="URL 첨부파일(HWP/HWPX/PDF) 다운로드 및 텍스트 추출")
async def parse_from_url(req: ParserRequest):
    try:
        text = await parser_service.parse_document_from_url(req.fileUrl, req.fileType)
        return ParserResponse(
            success=True,
            fileType=req.fileType,
            extractedText=text,
            characterCount=len(text),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parsing error: {str(e)}")

@router.post("/upload", response_model=ParserResponse, summary="로컬 HWP/HWPX/PDF 파일 직접 업로드 및 텍스트 추출")
async def parse_uploaded_file(file: UploadFile = File(...)):
    try:
        content = await file.read()
        filename = file.filename or ""
        ext = filename.split(".")[-1].upper() if "." in filename else "PDF"
        
        if "HWPX" in ext:
            text = parser_service.parse_hwpx(content)
        elif "HWP" in ext:
            text = parser_service.parse_hwp5(content)
        else:
            text = parser_service.parse_pdf(content)

        return ParserResponse(
            success=True,
            fileName=filename,
            fileType=ext,
            extractedText=text,
            characterCount=len(text),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload parsing error: {str(e)}")
