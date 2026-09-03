import sys, os
sys.path.insert(0, os.path.abspath("."))
from app.core.database import SessionLocal
from sqlalchemy import text
import json

db = SessionLocal()
query = text("""
    SELECT d."fileType", count(*)
    FROM "SupportDocument" d
    GROUP BY d."fileType"
""")
rows = db.execute(query).fetchall()
print("Document fileTypes distribution:")
for r in rows:
    print(f"  {r[0]}: {r[1]}")

query2 = text("""
    SELECT s."sourceType", count(distinct s."supportProgramId")
    FROM "SupportSource" s
    WHERE s."rawData" LIKE '%지원내용%'
    GROUP BY s."sourceType"
""")
rows2 = db.execute(query2).fetchall()
print("\nPrograms with enriched HTML '지원내용':")
for r in rows2:
    print(f"  {r[0]}: {r[1]}")
