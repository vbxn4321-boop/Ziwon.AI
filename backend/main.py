import sys
import os
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

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start Background Scheduler
    print("[START] Starting Ziwon.AI FastAPI Core Engine...")
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

# Setup CORS Middleware (Support all origins, Vercel & localhost, Preflight 200)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?:\/\/.*",
    allow_credentials=True,
    allow_methods=["*"],
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
