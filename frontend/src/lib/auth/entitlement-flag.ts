/**
 * 유료 이용권(AI 분석 이용권) 강제 적용 여부.
 *
 * 대표님 방침: 유료 티어링은 아직 사업적으로 확정 전이다. 이용권 확인 로직은
 * 만들어두되(psst-chat, psst-plan 둘 다) 실제로 사용자를 막는 건 나중에 켠다.
 *
 * 이 스위치가 꺼져 있는 동안(기본값)은:
 *   - 이용권 조회는 그대로 실행된다 (DB 쿼리, unlocked 판정 전부 동작).
 *   - 다만 unlocked=false 여도 요청을 막지 않고 통과시킨다.
 *   - "지금 켜면 막혔을 요청"이라는 걸 로그로 남긴다 — 실제로 켤 때
 *     예상 차단 규모를 미리 가늠할 수 있게.
 *
 * 켜려면 배포 환경변수에 ENFORCE_PAID_ENTITLEMENT=1 을 추가한다.
 * (여기서 코드를 다시 고칠 필요는 없다 — 이게 이 플래그를 만든 이유다.)
 */
export const ENTITLEMENT_ENFORCED = process.env.ENFORCE_PAID_ENTITLEMENT === "1";
