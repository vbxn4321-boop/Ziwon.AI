import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Robust dotenv loading for both root and backend contexts
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, "../.."))
load_dotenv(os.path.join(backend_dir, ".env"))
load_dotenv()

def _detect_environment() -> str:
    """
    실행 환경을 판별합니다.

    ENVIRONMENT 를 깜빡 빼먹으면 "development" 로 떨어지고, 그러면 Redis fail-closed
    가드와 OTP 프로덕션 가드가 통째로 비활성화됩니다. 안전장치가 있는 줄 알았는데
    실제로는 꺼져 있는 상태가 가장 위험하므로, 플랫폼이 주는 신호로도 추론합니다.
    """
    explicit = os.getenv("ENVIRONMENT")
    if explicit and explicit.strip():
        return explicit.strip().lower()

    # Railway / Render 등은 자체 환경변수를 자동 주입합니다.
    platform_signals = ("RAILWAY_ENVIRONMENT", "RAILWAY_PROJECT_ID", "RENDER", "FLY_APP_NAME")
    if any(os.getenv(key) for key in platform_signals):
        print("[Config] ENVIRONMENT 가 없지만 배포 플랫폼 신호를 감지해 production 으로 판단합니다.")
        return "production"

    return "development"


class Settings(BaseSettings):
    PROJECT_NAME: str = "Ziwon.AI Core API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment
    ENVIRONMENT: str = _detect_environment()
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
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "")
    
    # CORS
    # allow_origins 는 정확히 일치하는 오리진만 비교합니다(글롭 미지원).
    # 따라서 "https://*.vercel.app" 같은 패턴은 여기가 아니라
    # ALLOWED_ORIGIN_REGEX 로 분리해서 지정해야 합니다.
    ALLOWED_ORIGINS: str = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000"
    )
    # Vercel 프리뷰 배포처럼 오리진이 매번 바뀌는 경우에만 쓰는 정규식.
    #
    # 기본값을 비워둡니다. ^https://.*\.vercel\.app$ 같은 패턴은 편해 보이지만
    # vercel.app 서브도메인은 누구나 무료로 발급받을 수 있어서, 사실상
    # "Vercel 에 배포한 아무나 허용"이 됩니다. allow_credentials=True 와 함께 쓰면
    # 방어가 쿠키의 SameSite 설정 한 겹에만 의존하게 됩니다.
    #
    # 프리뷰 배포를 허용해야 한다면 반드시 프로젝트 이름으로 좁혀서 지정하세요:
    #   ALLOWED_ORIGIN_REGEX="^https://ziwon-ai[a-z0-9-]*\.vercel\.app$"
    ALLOWED_ORIGIN_REGEX: str = os.getenv("ALLOWED_ORIGIN_REGEX", "")

    @property
    def cors_origins(self) -> List[str]:
        """와일드카드가 섞여 들어와도 조용히 무시되지 않도록 걸러내고 경고합니다."""
        origins: List[str] = []
        for raw in self.ALLOWED_ORIGINS.split(","):
            origin = raw.strip()
            if not origin:
                continue
            if "*" in origin:
                print(
                    f"[CORS Warning] '{origin}' 는 와일드카드라 allow_origins 에서 "
                    "매칭되지 않습니다. ALLOWED_ORIGIN_REGEX 를 사용하세요."
                )
                continue
            origins.append(origin)
        return origins

    @property
    def cors_origin_regex(self) -> Optional[str]:
        pattern = self.ALLOWED_ORIGIN_REGEX.strip()
        return pattern or None

    class Config:
        case_sensitive = True

settings = Settings()
