from fastapi import APIRouter
from app.api.v1 import health, crawler, parser, psst, users, companies, plans, bookmarks, auth, admin

api_router = APIRouter()

# Core Services
api_router.include_router(health.router, tags=["Health & Status"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & OTP"])
api_router.include_router(crawler.router, prefix="/crawler", tags=["Crawler Pipeline"])
api_router.include_router(parser.router, prefix="/parser", tags=["Document Parser (HWP/PDF)"])
api_router.include_router(psst.router, prefix="/psst", tags=["PSST AI Generator"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin & Deduplication"])

# User Profile & Member Data CRUD
api_router.include_router(users.router, prefix="/users", tags=["User Profile"])
api_router.include_router(companies.router, prefix="/companies", tags=["Company Profile CRUD"])
api_router.include_router(plans.router, prefix="/plans", tags=["Saved PSST Plans CRUD"])
api_router.include_router(bookmarks.router, prefix="/bookmarks", tags=["Bookmarks / Scraps"])
