import sys, os
sys.path.insert(0, os.path.abspath("."))
import asyncio, httpx
from app.core.config import settings
from urllib.parse import unquote
import xml.etree.ElementTree as ET

async def main():
    key = unquote(settings.KSTARTUP_API_KEY).strip()
    url = "https://apis.data.go.kr/B552735/kisedKstartupService01/getAnnouncementInformation01"
    async with httpx.AsyncClient(timeout=30) as client:
        # Test numOfRows = 500
        res = await client.get(url, params={"serviceKey": key, "pageNo": 1, "numOfRows": 500})
        print(f"Status: {res.status_code}")
        root = ET.fromstring(res.text)
        
        # Check header/body
        for elem in root:
            if elem.tag != "data":
                print(f"  {elem.tag}: {elem.text}")
        
        # Test with perPage=500
        res_500 = await client.get(url, params={"serviceKey": key, "page": 1, "perPage": 500})
        root_500 = ET.fromstring(res_500.text)
        items_500 = list(root_500.iter("item"))
        print(f"Total items with perPage=500: {len(items_500)}")

        # Test with perPage=1000
        res_1000 = await client.get(url, params={"serviceKey": key, "page": 1, "perPage": 1000})
        root_1000 = ET.fromstring(res_1000.text)
        items_1000 = list(root_1000.iter("item"))
        print(f"Total items with perPage=1000: {len(items_1000)}")
        
        items = list(root.iter("item"))
        print(f"Total items in response: {len(items)}")

        # Also let's check what params the API accepts or if numOfRows has a maximum or if it supports pagination
        # Let's test pageNo=2
        res2 = await client.get(url, params={"serviceKey": key, "pageNo": 2, "numOfRows": 10})
        root2 = ET.fromstring(res2.text)
        items2 = list(root2.iter("item"))
        print(f"Total items in page 2: {len(items2)}")

if __name__ == "__main__":
    asyncio.run(main())
