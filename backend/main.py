import sys
import os
import re
from contextlib import asynccontextmanager

# Guarantee current directory in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.api import api_router
from app.services.scheduler_service import start_scheduler, shutdown_scheduler

def _print_startup_banner():
    """
    보안에 영향을 주는 설정이 실제로 어떻게 해석됐는지 기동 시 한 번 찍습니다.
    ENVIRONMENT 미설정 같은 문제는 조용히 넘어가면 안전장치가 꺼진 줄도 모르게 됩니다.
    비밀값은 출력하지 않고 설정 여부만 표시합니다.
    """
    from app.core.redis_client import redis_client

    is_prod = settings.ENVIRONMENT == "production"
    print("=" * 60)
    print(f"[Config] ENVIRONMENT      : {settings.ENVIRONMENT}")
    print(f"[Config] CORS allow_origins : {settings.cors_origins}")
    print(f"[Config] CORS origin_regex  : {settings.cors_origin_regex}")
    print(f"[Config] JWT_SECRET       : {'설정됨' if settings.JWT_SECRET else '!! 없음 !!'}")
    print(f"[Config] REDIS_URL        : {'설정됨' if settings.REDIS_URL else '!! 없음 !!'}")
    print(f"[Config] Redis 연결       : {'정상' if redis_client.is_connected() else '끊김'}")

    if is_prod and not settings.JWT_SECRET:
        print("[Config CRITICAL] 프로덕션인데 JWT_SECRET 이 없습니다. 인증이 동작하지 않습니다.")
    if is_prod and not redis_client.is_connected():
        print("[Config CRITICAL] 프로덕션인데 Redis 연결이 없습니다. OTP/세션 발급이 거부됩니다.")
    if is_prod and not settings.cors_origins and not settings.cors_origin_regex:
        print("[Config CRITICAL] 허용된 CORS 오리진이 하나도 없습니다. 프론트엔드 요청이 전부 차단됩니다.")
    elif is_prod and not settings.cors_origin_regex:
        # localhost 만 남아 있으면 실제 프론트엔드는 전부 막힙니다.
        # ALLOWED_ORIGINS 를 설정하지 않고 배포했을 때 정확히 이 상태가 됩니다.
        non_local = [
            o for o in settings.cors_origins
            if "localhost" not in o and "127.0.0.1" not in o
        ]
        if not non_local:
            print(
                "[Config CRITICAL] 프로덕션인데 허용 오리진이 localhost 뿐입니다. "
                "ALLOWED_ORIGINS 에 실제 프론트엔드 주소를 설정하세요. "
                "(예: https://ziwon-ai.vercel.app)"
            )

    # 정규식이 남의 소유 서브도메인까지 받아주는지 실제로 매칭해서 확인합니다.
    # vercel.app / netlify.app 서브도메인은 누구나 발급받을 수 있어서,
    # 프로젝트 이름으로 좁히지 않은 패턴은 사실상 무제한 허용이 됩니다.
    if settings.cors_origin_regex:
        try:
            pattern = re.compile(settings.cors_origin_regex)
            canaries = [
                "https://attacker-canary-9x8y7z.vercel.app",
                "https://attacker-canary-9x8y7z.netlify.app",
                "https://attacker-canary-9x8y7z.com",
            ]
            matched = [c for c in canaries if pattern.match(c)]
            if matched:
                print(
                    "[Config WARNING] ALLOWED_ORIGIN_REGEX 가 제3자 소유 도메인까지 허용합니다: "
                    f"{matched[0]} 매칭됨. 프로젝트 이름으로 좁히세요. "
                    r'예) ^https://ziwon-ai[a-z0-9-]*\.vercel\.app$'
                )
        except re.error as e:
            print(f"[Config CRITICAL] ALLOWED_ORIGIN_REGEX 정규식이 잘못되었습니다: {e}")
    if not is_prod:
        print("[Config] 개발 모드: Redis 인메모리 폴백이 허용됩니다. 배포 환경이라면 ENVIRONMENT=production 을 설정하세요.")
    print("=" * 60)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start Background Scheduler
    print("[START] Starting Ziwon.AI FastAPI Core Engine...")
    _print_startup_banner()
    start_scheduler()
    yield
    # Shutdown: Stop Background Scheduler
    print("[STOP] Shutting down Ziwon.AI FastAPI Core Engine...")
    shutdown_scheduler()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Ziwon.AI Python Backend Engine",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Setup CORS Middleware
# allow_credentials=True 와 "모든 오리진 허용"을 함께 쓰면 임의의 사이트가 사용자
# 세션을 실은 요청을 보낼 수 있으므로, 허용 오리진을 명시적으로 제한합니다.
# 정확히 일치하는 오리진은 ALLOWED_ORIGINS, 패턴(프리뷰 배포)은 ALLOWED_ORIGIN_REGEX.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Register API Router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "service": "Ziwon.AI Python Core Engine",
        "docs": "/docs",
        "version": settings.VERSION,
        "status": "online",
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    print(f"[Ziwon.AI Engine] Starting on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
