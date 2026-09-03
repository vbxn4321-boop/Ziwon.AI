import sys, os, urllib.request, json
sys.path.insert(0, os.path.abspath("."))
from app.core.database import SessionLocal
from sqlalchemy import text

# 1. Telemetry
res = urllib.request.urlopen('http://localhost:3000/api/telemetry/heartbeat')
telemetry = json.loads(res.read().decode('utf-8'))['data']
print('Current Telemetry Data:')
print('  Active Users Now:', telemetry['activeUsersNow'])
print('  Today Visitors:', telemetry['todayVisitors'])
print('  Logged-in Users:', telemetry['loggedInUsers'])
print('  Guest Users:', telemetry['guestUsers'])
print('  Active Pages:', telemetry['activePages'])

# 2. Database Users
db = SessionLocal()
query = text("""SELECT id, email, name, role, "createdAt" FROM "User" ORDER BY "createdAt" ASC""")
users = db.execute(query).fetchall()
print(f"\nTotal Registered Users in DB: {len(users)}")
for u in users:
    print(f"  - Email: {u[1]} | Name: {u[2]} | Role: {u[3]} | Created: {u[4]}")
