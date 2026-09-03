import re
import uuid
import json
from datetime import datetime
from difflib import SequenceMatcher
from sqlalchemy import text
from app.core.database import SessionLocal

def normalize_title(title: str) -> str:
    """
    제목 정규화 알고리즘:
    - [서울], (창업공모전) 등 맨 앞의 말머리/카테고리 태그만 제거
    - 2026년, 2025 등 연도 표기 제거
    - 한글, 영문, 숫자 외 공백 및 특수문자 제거 (본문 괄호 내부의 중요 키워드는 보존)
    - 소문자 통일
    """
    if not title:
        return ""
    # 맨 앞의 태그 [인천], (창업공모전) 등을 반복 제거
    t = re.sub(r'^\s*(\[.*?\]|\(.*?\))\s*', '', title)
    t = re.sub(r'^\s*(\[.*?\]|\(.*?\))\s*', '', t)
    # 연도 패턴 제거
    t = re.sub(r"202[0-9]년?|20[0-9]{2}", "", t)
    # 한글, 영문, 숫자만 남기고 제거 (본문 내 SCEWC, TechCrunch 등 중요 키워드는 유지됨)
    t = re.sub(r"[^가-힣a-zA-Z0-9]", "", t)
    return t.strip().lower()

class DedupService:
    @staticmethod
    def is_date_compatible(date1, date2, tolerance_days: int = 14) -> bool:
        """마감일 호환성 검증: 둘 다 없거나, 오차 범위(기본 14일) 내인 경우 True"""
        if not date1 or not date2:
            return True
        try:
            d1 = date1 if isinstance(date1, datetime) else datetime.fromisoformat(str(date1)[:10])
            d2 = date2 if isinstance(date2, datetime) else datetime.fromisoformat(str(date2)[:10])
            return abs((d1 - d2).days) <= tolerance_days
        except Exception:
            return True

    @staticmethod
    def is_subtrack_compatible(item1, item2) -> bool:
        """세부 트랙 호환성: 둘 다 괄호 안의 고유 키워드(예: TechCrunch vs SCEWC)가 존재하는 경우 일치해야 함"""
        has_sub1 = item1.get("normTitle") != item1.get("coreNormTitle")
        has_sub2 = item2.get("normTitle") != item2.get("coreNormTitle")
        if has_sub1 and has_sub2:
            return item1.get("normTitle") == item2.get("normTitle")
        return True

    @staticmethod
    def find_duplicate_pairs(db=None):
        """DB 내 기업마당(BIZINFO)과 K-Startup 간 중복 공고 전수 탐색"""
        should_close = False
        if db is None:
            db = SessionLocal()
            should_close = True

        try:
            # 1. BIZINFO와 K_STARTUP 공고 로드
            programs = db.execute(text('''
                SELECT 
                    p.id, 
                    p.title, 
                    p.organizer, 
                    p."startDate", 
                    p."endDate",
                    s."sourceType", 
                    s."externalId", 
                    s."sourceUrl",
                    (SELECT COUNT(*) FROM "SupportDocument" d WHERE d."supportProgramId" = p.id) as doc_count
                FROM "SupportProgram" p
                JOIN "SupportSource" s ON s."supportProgramId" = p.id
                WHERE p."duplicateStatus" != 'MERGED'
            ''')).fetchall()

            bizinfo_map = {}
            kstartup_list = []

            for row in programs:
                item = {
                    "id": row[0],
                    "title": row[1] or "",
                    "organizer": row[2] or "",
                    "startDate": row[3],
                    "endDate": row[4],
                    "sourceType": row[5],
                    "externalId": row[6],
                    "sourceUrl": row[7] or "",
                    "docCount": row[8],
                }
                item["normTitle"] = normalize_title(item["title"])
                item["coreNormTitle"] = normalize_title(re.sub(r'\(.*?\)', '', item["title"]))

                if row[5] == "BIZINFO":
                    # Map by normalized title and core title
                    norm = item["normTitle"]
                    core_norm = item["coreNormTitle"]
                    if norm not in bizinfo_map:
                        bizinfo_map[norm] = []
                    bizinfo_map[norm].append(item)
                    if core_norm != norm:
                        if core_norm not in bizinfo_map:
                            bizinfo_map[core_norm] = []
                        bizinfo_map[core_norm].append(item)
                elif row[5] == "K_STARTUP":
                    kstartup_list.append(item)

            duplicate_pairs = []
            seen_kst_ids = set()

            # 2. K-Startup 공고별로 BIZINFO 매칭
            for k in kstartup_list:
                k_id = k["id"]
                k_norm = k["normTitle"]
                k_core = k["coreNormTitle"]
                if (len(k_norm) < 3 and len(k_core) < 3) or k_id in seen_kst_ids:
                    continue

                best_match = None
                best_score = 0.0

                # 2-1. Direct Normalized Match
                for target_key in [k_norm, k_core]:
                    if target_key and target_key in bizinfo_map:
                        for candidate in bizinfo_map[target_key]:
                            if (candidate["id"] != k_id and
                                DedupService.is_date_compatible(candidate["endDate"], k["endDate"]) and
                                DedupService.is_subtrack_compatible(candidate, k)):
                                best_match = candidate
                                best_score = 1.0
                                break
                    if best_match:
                        break

                # 2-2. Fuzzy Substring / Similarity Match
                if not best_match:
                    for b_norm, candidates in bizinfo_map.items():
                        if len(b_norm) < 3:
                            continue
                        
                        score = 0.0
                        # Compare both full and core
                        for comp_k in [k_norm, k_core]:
                            if not comp_k:
                                continue
                            if b_norm in comp_k or comp_k in b_norm:
                                shorter = min(len(b_norm), len(comp_k))
                                longer = max(len(b_norm), len(comp_k))
                                if shorter / longer >= 0.65:
                                    score = max(score, 0.95)
                            else:
                                score = max(score, SequenceMatcher(None, b_norm, comp_k).ratio())

                        if score >= 0.82:
                            for candidate in candidates:
                                if (candidate["id"] != k_id and
                                    DedupService.is_date_compatible(candidate["endDate"], k["endDate"]) and
                                    DedupService.is_subtrack_compatible(candidate, k)):
                                    if score > best_score:
                                        best_score = score
                                        best_match = candidate


                if best_match and best_score >= 0.82:
                    seen_kst_ids.add(k_id)
                    duplicate_pairs.append({
                        "similarity": round(best_score * 100, 1),
                        "canonical": best_match,      # BIZINFO (우선 적재 대상)
                        "duplicate": k,               # K_STARTUP (통합 대상)
                    })

            return duplicate_pairs
        finally:
            if should_close:
                db.close()

    @staticmethod
    def merge_duplicates(db=None):
        """중복으로 적재된 K-Startup 공고를 BIZINFO 공고로 통합 병합"""
        should_close = False
        if db is None:
            db = SessionLocal()
            should_close = True

        try:
            pairs = DedupService.find_duplicate_pairs(db)
            merged_results = []

            for pair in pairs:
                canonical = pair["canonical"]
                duplicate = pair["duplicate"]

                canonical_id = canonical["id"]
                duplicate_id = duplicate["id"]

                # 1. K-Startup의 SupportSource를 canonical_id로 이전
                existing_src = db.execute(text('''
                    SELECT id FROM "SupportSource"
                    WHERE "supportProgramId" = :can_id AND "sourceType" = 'K_STARTUP'
                '''), {"can_id": canonical_id}).fetchone()

                if not existing_src:
                    db.execute(text('''
                        UPDATE "SupportSource"
                        SET "supportProgramId" = :can_id
                        WHERE "supportProgramId" = :dup_id AND "sourceType" = 'K_STARTUP'
                    '''), {"can_id": canonical_id, "dup_id": duplicate_id})
                else:
                    db.execute(text('''
                        DELETE FROM "SupportSource" WHERE "supportProgramId" = :dup_id
                    '''), {"dup_id": duplicate_id})

                # 2. SupportDocument 이전 (중복 파일명이 아닌 경우에만)
                existing_doc_names = set(
                    r[0] for r in db.execute(text('''
                        SELECT "fileName" FROM "SupportDocument" WHERE "supportProgramId" = :can_id
                    '''), {"can_id": canonical_id}).fetchall()
                )

                dup_docs = db.execute(text('''
                    SELECT id, "fileName" FROM "SupportDocument" WHERE "supportProgramId" = :dup_id
                '''), {"dup_id": duplicate_id}).fetchall()

                for doc_id, fname in dup_docs:
                    if fname not in existing_doc_names:
                        db.execute(text('''
                            UPDATE "SupportDocument" SET "supportProgramId" = :can_id WHERE id = :doc_id
                        '''), {"can_id": canonical_id, "doc_id": doc_id})
                        existing_doc_names.add(fname)
                    else:
                        db.execute(text('DELETE FROM "SupportDocument" WHERE id = :doc_id'), {"doc_id": doc_id})

                # 3. 북마크 및 저장된 계획서 이전
                db.execute(text('''
                    UPDATE "SavedPsstPlan" SET "supportProgramId" = :can_id WHERE "supportProgramId" = :dup_id
                '''), {"can_id": canonical_id, "dup_id": duplicate_id})

                # 북마크 중복 충돌 방지
                db.execute(text('''
                    DELETE FROM "BookmarkedProgram" 
                    WHERE "supportProgramId" = :dup_id 
                    AND "userId" IN (SELECT "userId" FROM "BookmarkedProgram" WHERE "supportProgramId" = :can_id)
                '''), {"can_id": canonical_id, "dup_id": duplicate_id})

                db.execute(text('''
                    UPDATE "BookmarkedProgram" SET "supportProgramId" = :can_id WHERE "supportProgramId" = :dup_id
                '''), {"can_id": canonical_id, "dup_id": duplicate_id})

                # 4. K-Startup에서 얻을 수 있는 정보로 기업마당 공고 보완
                if duplicate.get("sourceUrl") and not canonical.get("sourceUrl"):
                    db.execute(text('''
                        UPDATE "SupportProgram" SET "targetDescription" = COALESCE("targetDescription", :desc)
                        WHERE id = :can_id
                    '''), {"can_id": canonical_id, "desc": duplicate.get("targetDescription")})

                # 5. 중복 SupportProgram 삭제 (출처는 이미 canonical로 이전됨)
                db.execute(text('''
                    DELETE FROM "SupportProgram" WHERE id = :dup_id
                '''), {"dup_id": duplicate_id})

                merged_results.append({
                    "canonicalTitle": canonical["title"],
                    "duplicateTitle": duplicate["title"],
                    "canonicalId": canonical_id,
                    "mergedKstId": duplicate_id,
                    "similarity": pair["similarity"],
                })

            db.commit()
            return merged_results
        except Exception as e:
            db.rollback()
            raise e
        finally:
            if should_close:
                db.close()

dedup_service = DedupService()
