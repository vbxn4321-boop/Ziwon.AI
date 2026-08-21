import time
from sqlalchemy import text
from app.core.database import get_db, SessionLocal
from app.core.security import AuthenticatedUser
from app.api.v1.users import get_my_profile

print("[Direct Python Debug Test]")
db = SessionLocal()
user = AuthenticatedUser(id="test-uuid-12345", email="debug@ziwon.ai", name="디버그 유저")

try:
    print("Calling get_my_profile directly...")
    t0 = time.time()
    res = get_my_profile(current_user=user, db=db)
    print("Result:", res, "Time:", time.time() - t0)
except Exception as e:
    print("Error:", e)
finally:
    db.close()
