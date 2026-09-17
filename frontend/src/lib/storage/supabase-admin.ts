import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * 서비스 롤 키로 만든 서버 전용 Supabase 클라이언트.
 *
 * 이 클라이언트는 RLS(행 단위 보안)를 우회한다. 접근 제어는 이 파일을 부르는
 * API 라우트가 `requireUser`로 직접 해야 하며, 이 클라이언트를 절대 브라우저로
 * 내려보내면 안 된다. `server-only` 패키지가 없어 빌드 타임에 강제하지는
 * 못하므로, 이 모듈은 반드시 API 라우트(`src/app/api/**`)에서만 import한다 —
 * "use client" 컴포넌트에서 절대 import하지 말 것.
 *
 * 앱의 로그인(`getJwtToken`)은 이 프로젝트 자체 JWT 체계라 Supabase Auth 세션과
 * 별개다. 그래서 Storage 접근도 Supabase Auth RLS 정책에 기대지 않고, 서비스
 * 롤로 서버가 대신 쓰고 우리 쪽 JWT로 소유권만 검사하는 방식을 쓴다.
 */
let client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY 가 설정되지 않았습니다. Supabase 대시보드 " +
        "(Project Settings → API → service_role)에서 발급받아 .env 와 Vercel " +
        "환경변수에 추가하세요."
    );
  }

  client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/** 사용자가 편집·저장한 HWP/HWPX 문서를 담는 버킷. */
export const USER_DOCUMENTS_BUCKET = "user-documents";
