import re

with open("scratch/kstartup_sample.html", "r", encoding="utf-8") as f:
    html = f.read()

print("Testing 126KB HTML parsing:")
intro_match = re.search(r'<div class=["\']box_inner["\']>[\s\S]*?<p class=["\']txt["\']>([\s\S]*?)<\/p>', html, re.I)
if intro_match:
    print("Found 공고소개:", intro_match.group(1)[:100].strip())

info_blocks = re.findall(r'<div class=["\']information_list["\']>([\s\S]*?)<\/ul>', html, re.I)
print(f"Found {len(info_blocks)} information_list blocks!")

for b in info_blocks:
    title_m = re.search(r'<p class=["\']title["\']>([^<]+)<\/p>', b, re.I)
    sec_title = title_m.group(1).strip() if title_m else "No Title"
    print(f"\nSection: [{sec_title}]")
    dots = re.findall(r'<li[^>]*class=["\']dot_list[^"\']*["\'][^>]*>([\s\S]*?)<\/li>', b, re.I)
    for d in dots:
        tit_m = re.search(r'<p class=["\']tit["\']>([^<]+)<\/p>', d, re.I)
        tit = tit_m.group(1).strip() if tit_m else ""
        txt_m = re.search(r'<(?:div|p) class=["\'](?:txt|txt-button|list_wrap|list)[^"\']*["\'][^>]*>([\s\S]*?)<\/(?:div|p)>', d, re.I)
        txt = re.sub(r'<[^>]+>', ' ', txt_m.group(1)).strip() if txt_m else ""
        print(f"    - {tit}: {txt[:60]}...")
