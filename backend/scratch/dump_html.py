import httpx

url = "https://www.k-startup.go.kr/web/contents/bizpbanc-deadline.do?schM=view&pbancSn=178923"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

res = httpx.get(url, headers=headers, follow_redirects=True, timeout=20)
with open("scratch/kstartup_sample.html", "w", encoding="utf-8") as f:
    f.write(res.text)

print("Saved HTML. First 500 chars:")
print(res.text[:500])
