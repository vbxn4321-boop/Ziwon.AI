import { prisma } from "@/lib/db";

/**
 * Supabase 소셜 로그인(구글·카카오)으로 검증된 이메일을, 우리 자체 User 테이블의
 * 계정으로 대응시킨다. 없으면 새로 만든다.
 *
 * 왜 필요한가: Supabase Auth 는 자기 자신의 auth.users 테이블에 신원을 두는데,
 * 이 앱의 모든 API·데이터(이용권, 저장 문서, 북마크 등)는 전부 우리 자체
 * public.User.id 를 외래키로 물고 있다. Supabase 쪽 신원을 검증하는 것과,
 * "이 사람을 우리 시스템의 어느 계정으로 볼 것인가"는 서로 다른 문제라
 * 이 단계가 따로 필요하다. 이메일을 매칭 키로 쓴다 — 같은 이메일로 이미
 * 일반 가입한 계정이 있으면 그 계정에 합류시키고, 없으면 소셜 전용
 * 계정을 새로 만든다(passwordHash 는 null 로 남는다 = 비밀번호 로그인은
 * 못 하고 소셜 로그인만 가능한 계정).
 */
export async function findOrCreateUserForSocialLogin(
  email: string,
  name?: string
): Promise<{ id: string; email: string; role: string; name: string | null }> {
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true, role: true, name: true },
  });
  if (existing) return existing;

  // 동시에 두 요청이 같은 신규 이메일로 들어오면 unique 제약에 하나가 걸린다.
  // 그 경우 이미 만들어진 행을 다시 조회해서 쓴다 — 실패로 취급하지 않는다.
  try {
    return await prisma.user.create({
      data: { email: normalizedEmail, name: name || null, role: "USER" },
      select: { id: true, email: true, role: true, name: true },
    });
  } catch (err: any) {
    if (err?.code === "P2002") {
      const raceWinner = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true, email: true, role: true, name: true },
      });
      if (raceWinner) return raceWinner;
    }
    throw err;
  }
}
