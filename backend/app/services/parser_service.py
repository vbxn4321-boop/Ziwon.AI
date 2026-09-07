import io
import zlib
import zipfile
import xml.etree.ElementTree as ET
import httpx
import olefile
from pypdf import PdfReader

class DocumentParserService:
    @staticmethod
    async def download_file(url: str) -> bytes:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            res = await client.get(url)
            res.raise_for_status()
            return res.content

    @staticmethod
    def parse_pdf(file_bytes: bytes) -> str:
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            text_chunks = []
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    text_chunks.append(text.strip())
            return "\n\n".join(text_chunks)
        except Exception as e:
            return f"[PDF Parsing Error: {str(e)}]"

    @staticmethod
    def parse_hwpx(file_bytes: bytes) -> str:
        """Parse HWPX (Open XML based zip archive)"""
        try:
            with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
                texts = []
                for name in z.namelist():
                    if name.startswith("Contents/section") and name.endswith(".xml"):
                        xml_content = z.read(name)
                        root = ET.fromstring(xml_content)
                        for elem in root.iter():
                            if elem.text:
                                t = elem.text.strip()
                                if t:
                                    texts.append(t)
                return "\n".join(texts)
        except Exception as e:
            return f"[HWPX Parsing Error: {str(e)}]"

    @staticmethod
    def parse_hwp5(file_bytes: bytes) -> str:
        """Parse HWP 5.0 Compound File (OLE) Binary Sections"""
        try:
            if not olefile.isOleFile(io.BytesIO(file_bytes)):
                return "[Not a valid OLE HWP file]"
            
            with olefile.OleFileIO(io.BytesIO(file_bytes)) as ole:
                sections = [s for s in ole.listdir() if s[0] == "BodyText" and s[1].startswith("Section")]
                extracted_texts = []
                
                for sec in sorted(sections):
                    stream = ole.openstream(sec)
                    data = stream.read()
                    try:
                        # Decompress raw deflate data without headers
                        decompressed = zlib.decompress(data, -15)
                        text = decompressed.decode("utf-16le", errors="ignore")
                        cleaned = "".join(ch for ch in text if ch.isprintable() or ch in "\n\r\t ")
                        extracted_texts.append(cleaned.strip())
                    except Exception:
                        pass
                        
                return "\n\n".join(extracted_texts)
        except Exception as e:
            return f"[HWP5 Parsing Error: {str(e)}]"

    @staticmethod
    def is_regular_zip(file_bytes: bytes) -> bool:
        """HWPX나 DOCX 오피스 파일이 아닌 순수 일반 압축 ZIP 파일인지 판별"""
        if not file_bytes or len(file_bytes) < 4:
            return False
        if file_bytes[:2] != b"PK":
            return False
        try:
            with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
                namelist = z.namelist()
                # HWPX 식별 (Contents/section XML 또는 version.xml)
                if any(n.startswith("Contents/section") or n == "version.xml" for n in namelist):
                    return False
                # DOCX 식별 (word/document.xml)
                if any(n.startswith("word/document") or n == "[Content_Types].xml" and any("word/" in x for x in namelist) for n in namelist):
                    return False
                return True
        except Exception:
            return False

    @classmethod
    def extract_and_parse_zip(cls, file_bytes: bytes) -> list:
        """
        ZIP 아카이브 내부의 모든 문서(PDF, HWP, HWPX, DOCX, TXT 등)를 인메모리에서 풀어
        각각 텍스트를 추출한 개별 문서 목록을 반환합니다.
        """
        extracted_docs = []
        try:
            with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
                for info in z.infolist():
                    # 디렉토리, 맥 OS 메타데이터, 숨김 파일 건너뛰기
                    if info.is_dir() or "__MACOSX" in info.filename or info.filename.startswith("."):
                        continue

                    # 50MB 초과 대용량 파일 또는 실행 파일 건너뛰기
                    if info.file_size > 50 * 1024 * 1024:
                        continue

                    # 한글 파일명 인코딩 안전 디코딩 (CP437 -> CP949/EUC-KR)
                    raw_filename = info.filename
                    try:
                        filename = raw_filename.encode("cp437").decode("cp949")
                    except Exception:
                        filename = raw_filename

                    # 경로 제거하고 순수 파일명만 추출
                    clean_name = filename.split("/")[-1].split("\\")[-1].strip()
                    if not clean_name:
                        continue

                    lower_name = clean_name.lower()
                    # 지원하지 않는 바이너리 확장자 제외
                    if lower_name.endswith((".exe", ".dll", ".zip", ".tar", ".gz", ".7z", ".mp4", ".avi", ".jpg", ".png")):
                        continue

                    try:
                        sub_bytes = z.read(info)
                    except Exception as read_err:
                        print(f"[ZIP Parser] Error reading {clean_name}: {read_err}")
                        continue

                    sub_text = ""
                    file_type = "FILE"

                    if lower_name.endswith(".pdf") or sub_bytes[:4] == b"%PDF":
                        file_type = "PDF"
                        sub_text = cls.parse_pdf(sub_bytes)
                    elif lower_name.endswith(".hwpx"):
                        file_type = "HWPX"
                        sub_text = cls.parse_hwpx(sub_bytes)
                    elif lower_name.endswith(".hwp") or sub_bytes[:4] == b"\xd0\xcf\x11\xe0":
                        file_type = "HWP"
                        sub_text = cls.parse_hwp5(sub_bytes)
                    elif lower_name.endswith(".txt"):
                        file_type = "TXT"
                        sub_text = sub_bytes.decode("utf-8", errors="ignore")

                    extracted_docs.append({
                        "fileName": clean_name,
                        "fileType": file_type,
                        "fileBytes": sub_bytes,
                        "extractedText": sub_text,
                    })
        except Exception as e:
            print(f"[ZIP Parser Error]: {e}")

        return extracted_docs

    @classmethod
    async def parse_document_from_url(cls, url: str, file_type: str) -> str:
        file_bytes = await cls.download_file(url)
        ft = file_type.upper()
        if "ZIP" in ft or cls.is_regular_zip(file_bytes):
            sub_docs = cls.extract_and_parse_zip(file_bytes)
            if sub_docs:
                merged_texts = []
                for doc in sub_docs:
                    if doc["extractedText"] and len(doc["extractedText"].strip()) > 10:
                        merged_texts.append(f"=== [첨부파일: {doc['fileName']}] ===\n{doc['extractedText'].strip()}")
                return "\n\n".join(merged_texts)
            return "[ZIP 아카이브: 지원 문서 추출 실패]"
        elif "PDF" in ft:
            return cls.parse_pdf(file_bytes)
        elif "HWPX" in ft:
            return cls.parse_hwpx(file_bytes)
        elif "HWP" in ft:
            return cls.parse_hwp5(file_bytes)
        else:
            # Fallback text attempt
            return file_bytes.decode("utf-8", errors="ignore")

parser_service = DocumentParserService()

