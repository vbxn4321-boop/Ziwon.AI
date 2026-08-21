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

    @classmethod
    async def parse_document_from_url(cls, url: str, file_type: str) -> str:
        file_bytes = await cls.download_file(url)
        ft = file_type.upper()
        if "PDF" in ft:
            return cls.parse_pdf(file_bytes)
        elif "HWPX" in ft:
            return cls.parse_hwpx(file_bytes)
        elif "HWP" in ft:
            return cls.parse_hwp5(file_bytes)
        else:
            # Fallback text attempt
            return file_bytes.decode("utf-8", errors="ignore")

parser_service = DocumentParserService()
