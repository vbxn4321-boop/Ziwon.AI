"""
기업마당(BIZINFO) 첨부 fileUrl 백필 스크립트.

crawler_service.py 의 예전 버그: 첨부파일 저장 시 실제 다운로드 주소(API의
flpthNm/printFlpthNm 필드) 대신 공고 페이지 주소(source_url)를 그대로
fileUrl 에 넣었다. 즉 SupportDocument.fileUrl == 그 프로그램의
SupportSource(BIZINFO).sourceUrl 인 행은 전부 잘못된 값이다.

각 SupportSource.rawData 에 크롤링 당시의 원본 API 응답이 그대로 저장돼
있으므로, 거기서 fileNm/flpthNm(그리고 printFileNm/printFlpthNm)을 "@" 로
나눠 파일명으로 매칭해 진짜 주소를 되찾는다.

기본은 dry-run. --live 를 줘야 실제로 DB 를 갱신한다.
"""
import sys
import json
import argparse

sys.path.insert(0, ".")
from app.core.database import SessionLocal
from sqlalchemy import text


def find_real_url(raw_data_json: str, file_name: str):
    try:
        data = json.loads(raw_data_json)
    except Exception:
        return None, "rawData 파싱 실패"

    for name_field, url_field in (("fileNm", "flpthNm"), ("printFileNm", "printFlpthNm")):
        names = [n.strip() for n in str(data.get(name_field) or "").split("@") if n.strip()]
        urls = [u.strip() for u in str(data.get(url_field) or "").split("@") if u.strip()]
        for idx, n in enumerate(names):
            if n == file_name:
                if idx < len(urls) and urls[idx]:
                    return urls[idx], None
                return None, f"{name_field}/{url_field} 개수 불일치"
    return None, "매칭되는 파일명 없음"


def main(dry_run: bool):
    db = SessionLocal()
    try:
        rows = db.execute(text("""
            SELECT sd.id, sd."fileName", sd."fileUrl", ss."rawData"
            FROM "SupportDocument" sd
            JOIN "SupportSource" ss
                ON ss."supportProgramId" = sd."supportProgramId"
                AND ss."sourceType" = 'BIZINFO'
            WHERE sd."fileUrl" = ss."sourceUrl"
        """)).fetchall()

        print(f"=== 기업마당 첨부 URL 백필 ({'DRY RUN' if dry_run else 'LIVE UPDATE'}) ===")
        print(f"버그 있는 것으로 의심되는 첨부 문서: {len(rows)}건\n")

        fixed = []
        unmatched = []
        for doc_id, file_name, old_url, raw_data in rows:
            new_url, reason = find_real_url(raw_data, file_name)
            if new_url:
                fixed.append((doc_id, file_name, old_url, new_url))
            else:
                unmatched.append((doc_id, file_name, reason))

        print(f"실제 주소로 고칠 수 있는 건: {len(fixed)}건")
        print(f"매칭 실패(그대로 둠): {len(unmatched)}건\n")

        print("--- 고칠 건 예시 (최대 5개) ---")
        for doc_id, file_name, old_url, new_url in fixed[:5]:
            print(f"  {file_name}")
            print(f"    old: {old_url}")
            print(f"    new: {new_url}")

        if unmatched:
            print("\n--- 매칭 실패 예시 (최대 5개) ---")
            for doc_id, file_name, reason in unmatched[:5]:
                print(f"  {file_name} - {reason}")

        if dry_run:
            print("\n(dry run 이므로 DB는 변경하지 않았습니다. --live 로 실행하면 반영됩니다.)")
            return

        for doc_id, file_name, old_url, new_url in fixed:
            db.execute(
                text('UPDATE "SupportDocument" SET "fileUrl" = :url, "updatedAt" = NOW() WHERE id = :id'),
                {"url": new_url, "id": doc_id},
            )
        db.commit()
        print(f"\n✅ {len(fixed)}건 실제로 업데이트했습니다.")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true", help="실제로 DB에 반영 (기본은 dry-run)")
    args = parser.parse_args()
    main(dry_run=not args.live)
