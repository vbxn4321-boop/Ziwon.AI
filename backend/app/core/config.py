import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Robust dotenv loading for both root and backend contexts
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, "../.."))
load_dotenv(os.path.join(backend_dir, ".env"))
load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "Ziwon.AI Core API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    PORT: int = int(os.getenv("PORT", 8000))
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/postgres"
    )
    
    # Redis (Upstash / Railway / Local)
    REDIS_URL: Optional[str] = os.getenv("REDIS_URL", None)
    
    # Google Gemini
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # Ingestion Keys
    BIZINFO_API_KEY: str = os.getenv("BIZINFO_API_KEY", "")
    KSTARTUP_API_KEY: str = os.getenv("KSTARTUP_API_KEY", "")
    
    # JWT & Auth Security
    JWT_SECRET: str = os.getenv("JWT_SECRET", "")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    
    # CORS
    ALLOWED_ORIGINS: str = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,https://*.vercel.app,http://127.0.0.1:3000"
    )
    
    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    class Config:
        case_sensitive = True

settings = Settings()
