import asyncio
import time
import os
import sys

# Configure UTF-8 encoding for Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.services.crawler_service import CrawlerService

async def test_live_fetch():
    print("=" * 60)
    print("🔍 [기업마당(Bizinfo) & K-Startup 실시간 수집 진단 테스트]")
    print(f"• BIZINFO_API_KEY 설정 여부: {'등록됨 (앞 4자리: ' + settings.BIZINFO_API_KEY[:4] + '***)' if settings.BIZINFO_API_KEY else '❌ 미등록 (DUMMY 키 사용)'}")
    print(f"• KSTARTUP_API_KEY 설정 여부: {'등록됨 (앞 4자리: ' + settings.KSTARTUP_API_KEY[:4] + '***)' if settings.KSTARTUP_API_KEY else '❌ 미등록 (DUMMY 키 사용)'}")
    print("=" * 60)

    # 1. Test Bizinfo (5건 & 500건)
    print("\n▶ 1. 기업마당(Bizinfo) API 테스트 (대용량 500건 요청)...")
    start_t = time.time()
    biz_items = await CrawlerService.fetch_bizinfo(limit=500)
    elapsed = time.time() - start_t
    print(f"   ⏱️ 소요 시간: {elapsed:.2f}초")
    print(f"   📦 수신 건수: {len(biz_items)}건")
    if biz_items:
        print("   📄 최신 공고 샘플 (상위 3건):")
        for idx, item in enumerate(biz_items[:3], 1):
            print(f"      {idx}. {item.get('pblancNm')} (기관: {item.get('jnsmAgencyNm') or item.get('jrsdInsttNm')})")
    else:
        print("   ⚠️ 데이터를 가져오지 못했습니다. 위의 에러 로그를 확인하세요.")

    # 2. Test K-Startup
    print("\n▶ 2. K-Startup API 테스트 (대용량 100건 요청)...")
    start_t = time.time()
    kst_items = await CrawlerService.fetch_kstartup(limit=100)
    elapsed = time.time() - start_t
    print(f"   ⏱️ 소요 시간: {elapsed:.2f}초")
    print(f"   📦 수신 건수: {len(kst_items)}건")
    if kst_items:
        print("   📄 샘플 공고 제목 (상위 3건):")
        for idx, item in enumerate(kst_items[:3], 1):
            title = item.get("biz_pbanc_nm") or item.get("intg_pbanc_biz_nm") or item.get("공고명") or item.get("사업명")
            print(f"      {idx}. {title}")
    else:
        print("   ⚠️ 데이터를 가져오지 못했습니다. 위의 에러 로그를 확인하세요.")

    # 3. Test Full Pipeline (DB Ingestion & Deduplication)
    print("\n▶ 3. 통합 크롤링 파이프라인 및 DB 적재 테스트 (출처당 5건)...")
    start_t = time.time()
    try:
        new_ingested = await CrawlerService.run_pipeline(limit_per_source=5)
        elapsed = time.time() - start_t
        print(f"   ⏱️ 파이프라인 소요 시간: {elapsed:.2f}초")
        print(f"   🎉 신규 DB 적재 건수: {new_ingested}건 (기존 중복 데이터는 자동 건너뜀)")
    except Exception as e:
        print(f"   ❌ 파이프라인 실행 중 오류: {e}")

    print("\n" + "=" * 60)
    print("🏁 [전체 진단 및 작동 테스트 완료]")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_live_fetch())

