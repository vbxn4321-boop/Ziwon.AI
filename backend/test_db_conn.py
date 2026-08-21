import time
from sqlalchemy import text
from app.core.database import SessionLocal

start = time.time()
print("Connecting to DB...")
db = SessionLocal()
try:
    res = db.execute(text("SELECT 1")).fetchone()
    print("DB Result:", res, "Time taken:", time.time() - start)
finally:
    db.close()
