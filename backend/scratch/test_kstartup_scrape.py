import httpx
import re

url = "https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do?schM=view&pbancSn=178923"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

res = httpx.get(url, headers=headers, follow_redirects=True, timeout=20)
print("Status:", res.status_code)
html = res.text

print("HTML Length:", len(html))
for kw in ["신청방법", "지원내용", "제출서류", "선정절차", "신청대상", "첨부", "download"]:
    matches = len(re.findall(kw, html))
    print(f"Keyword '{kw}': {matches} occurrences")

# Find container divs or classes
classes = set(re.findall(r'class=["\']([^"\']+)["\']', html))
print("\nSome sample classes:")
for c in list(classes)[:30]:
    if any(k in c.lower() for k in ["view", "info", "detail", "box", "list", "cont"]):
        print(" ", c)
