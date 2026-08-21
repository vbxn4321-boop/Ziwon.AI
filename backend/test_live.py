import requests

r = requests.get("http://127.0.0.1:8000/api/v1/health")
print("Health:", r.status_code, r.json())

r1 = requests.post("http://127.0.0.1:8000/api/v1/auth/send-otp", json={"email": "demo@ziwon.ai"})
print("Send OTP:", r1.status_code, r1.json())
