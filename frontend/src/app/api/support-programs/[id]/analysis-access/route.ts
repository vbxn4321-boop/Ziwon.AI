import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/auth/verify-token";
import { getAnalysisAccess, getCachedAnalysis } from "@/lib/auth/analysis-access";

/**
 * 이 계정이 이 공고의 AI 분석을 열어 뒀는지 확인한다.
 *
 * 상세 페이지에서 `사업계획서 작성` 을 누를 때 호출한다. 결과에 따라
 * 안내 없이 바로 넘길지, 먼저 알리고 선택을 받을지가 갈린다.
 *
 * 비로그인도 401 대신 `unlocked: false` 로 답한다. 호출부가 필요한 건
 * "열려 있나 아닌가" 하나뿐이고, 로그인 유도는 상세 페이지가 이미 한다.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: "공고 ID가 없습니다." }, { status: 400 });
    }

    const user = getOptionalUser(req);
    const access = await getAnalysisAccess(user?.sub ?? null, id);

    // 열려 있으면 분석 본문까지 같이 준다. 계획서 작성 화면이 이걸 그대로 쓰므로
    // sessionStorage 로 넘기던 경로가 없어도 되고, 주소로 바로 들어와도 살아난다.
    let analysis: unknown = null;
    if (access.unlocked) {
      const cached = await getCachedAnalysis(id);
      if (cached) {
        try {
          analysis = JSON.parse(cached.resultJson);
        } catch {
          console.warn(`[분석 이용권 조회] 공고 ${id}: 저장된 분석 JSON 파싱 실패`);
        }
      }
    }

    return NextResponse.json({ success: true, ...access, analysis });
  } catch (error: any) {
    console.error("[분석 이용권 조회] 실패:", error);
    return NextResponse.json(
      { success: false, error: "분석 이용권을 확인하지 못했습니다." },
      { status: 500 }
    );
  }
}
