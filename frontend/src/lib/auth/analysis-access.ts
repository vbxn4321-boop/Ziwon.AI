/**
 * 계정 단위 AI 분석 이용권
 *
 * 분석 결과(`SupportAnalysis`)는 공고 단위 캐시이고, 이용권
 * (`UserProgramAnalysis`)은 계정 단위다. 이 둘을 일부러 나눴다.
 *
 * - 과금은 계정별로 한다. A 가 분석한 공고를 B 가 열어도 B 는 따로 열어야 한다.
 * - Gemini 호출은 공고당 한 번만 한다. B 가 열 때는 A 가 만들어 둔 분석을
 *   그대로 재사용하므로 토큰이 0원이다.
 *
 * 둘을 한 테이블로 합치면 둘 중 하나를 포기해야 한다. 공고 단위로만 두면
 * 한 명이 분석한 순간 그 공고는 전원 무료가 되고, 계정 단위로만 두면 같은
 * 공고를 열 때마다 토큰을 새로 태운다.
 */

import { prisma } from "@/lib/db";

export interface AnalysisAccess {
  /** 이 계정이 이 공고의 분석을 열어 둔 상태인가 (= 계획서 작성 게이트 통과) */
  unlocked: boolean;
  /** 공고 단위 분석 캐시가 이미 있는가 (= 열더라도 토큰을 안 쓴다) */
  hasAnalysis: boolean;
}

/**
 * 게이트 판정. 비로그인(userId 없음)이면 언제나 잠긴 것으로 본다.
 *
 * `hasAnalysis` 는 잠겨 있을 때도 알려준다. "지금 분석하기"를 눌렀을 때
 * 기다림 없이 바로 열린다는 걸 미리 안내할 수 있어서다.
 */
export async function getAnalysisAccess(
  userId: string | null,
  supportProgramId: string
): Promise<AnalysisAccess> {
  const [unlock, analysisCount] = await Promise.all([
    userId
      ? prisma.userProgramAnalysis.findUnique({
          where: { userId_supportProgramId: { userId, supportProgramId } },
          select: { id: true },
        })
      : Promise.resolve(null),
    prisma.supportAnalysis.count({ where: { supportProgramId, status: "COMPLETED" } }),
  ]);

  return { unlocked: Boolean(unlock), hasAnalysis: analysisCount > 0 };
}

/**
 * 이용권을 발급한다. 이미 있으면 그대로 둔다.
 *
 * @param consumedTokens 이번에 Gemini 를 실제로 불렀는지. 재사용이면 false.
 *                       나중에 "우리가 이 사용자에게 얼마를 썼나"를 따질 때 쓴다.
 */
export async function grantAnalysisAccess(
  userId: string,
  supportProgramId: string,
  consumedTokens: boolean
): Promise<boolean> {
  try {
    await prisma.userProgramAnalysis.upsert({
      where: { userId_supportProgramId: { userId, supportProgramId } },
      // 두 번째부터는 토큰을 안 쓰므로 최초 발급 시점과 과금 사실을 덮어쓰지 않는다
      update: {},
      create: { userId, supportProgramId, consumedTokens },
    });
    return true;
  } catch (e: any) {
    // 여기서 예외를 올리면 이미 성공한 분석까지 통째로 500 이 된다.
    // 실제로 그 일이 있었다: Gemini 를 부르고 결과까지 저장한 뒤 이 줄에서
    // 터져서, 토큰은 썼는데 사용자는 실패 화면을 봤다.
    //
    // 이용권 기록은 다시 만들 수 있다. 다음에 또 누르면 분석 캐시가 있으니
    // 토큰 없이 발급된다. 그래서 여기서는 크게 남기고 넘어간다.
    console.error(
      `[분석 이용권] 발급 실패 (user=${userId}, program=${supportProgramId}): ${e.message}`
    );
    return false;
  }
}

/** 공고 단위 분석 캐시에서 최신 결과를 꺼낸다. 없으면 null. */
export async function getCachedAnalysis(
  supportProgramId: string
): Promise<{ id: string; resultJson: string; createdAt: Date } | null> {
  return prisma.supportAnalysis.findFirst({
    where: { supportProgramId, status: "COMPLETED" },
    orderBy: { createdAt: "desc" },
    select: { id: true, resultJson: true, createdAt: true },
  });
}
