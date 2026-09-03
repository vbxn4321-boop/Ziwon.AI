import sys, os
sys.path.insert(0, os.path.abspath("."))
from app.core.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

# Delete dummy users except qjawls2617@naver.com
deleted = db.execute(text("""
    DELETE FROM "User"
    WHERE email != 'qjawls2617@naver.com'
    RETURNING email
""")).fetchall()
db.commit()

print(f"Deleted {len(deleted)} test dummy users:")
for d in deleted:
    print("  - Removed:", d[0])

# Also make sure qjawls2617@naver.com has ADMIN role so they have full access
db.execute(text("""
    UPDATE "User"
    SET role = 'ADMIN'
    WHERE email = 'qjawls2617@naver.com'
"""))
db.commit()

remaining = db.execute(text('SELECT id, email, name, role FROM "User"')).fetchall()
print(f"\nRemaining Users ({len(remaining)}):")
for r in remaining:
    print(f"  - Email: {r[1]} | Name: {r[2]} | Role: {r[3]}")
