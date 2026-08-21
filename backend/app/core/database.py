import os
import re
from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

def clean_database_url(url: str) -> str:
    if not url:
        return ""
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    
    url = re.sub(r'[?&]pgbouncer=[^&]*', '', url)
    url = re.sub(r'[?&]connection_limit=[^&]*', '', url)
    
    if url.endswith("?") or url.endswith("&"):
        url = url[:-1]
    
    if "supabase.com" in url and "sslmode=" not in url:
        sep = "&" if "?" in url else "?"
        url = f"{url}{sep}sslmode=require"
        
    return url

raw_url = os.getenv("DIRECT_URL") or settings.DATABASE_URL
db_url = clean_database_url(raw_url)

# NullPool is ideal for Supabase transaction pooler and async FastAPI servers
engine = create_engine(
    db_url,
    poolclass=NullPool,
    connect_args={"connect_timeout": 15},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
