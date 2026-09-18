import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/verify-token";

export async function GET(req: NextRequest) {
  // 이용권(유료)까지 요구하지는 않는다 — 분석을 안 연 계정도 에디터 전용 모드에서
  // 첨부 원문은 봐야 하기 때문이다. 다만 첨부파일 목록·원문 경로가 나가는
  // 라우트라 로그인은 요구한다. (/consultant 자체가 로그인 전용 화면이다)
  const auth = await requireUser(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.reason }, { status: 401 });
  }

  const programId = req.nextUrl.searchParams.get("programId");
  if (!programId) return NextResponse.json({ success: false, error: "programId가 필요합니다." }, { status: 400 });

  try {
    const { prisma } = await import("@/lib/db");
    const program = await prisma.supportProgram.findUnique({
      where: { id: programId },
      include: { documents: { select: { fileName: true, fileUrl: true, entryPath: true, fileType: true, extractedText: true } } },
    });
    if (!program) return NextResponse.json({ success: false, error: "공고를 찾을 수 없습니다." }, { status: 404 });

    const { loadRealFormSchema } = await import("@/lib/parser/load-form-schema");
    const schema = await loadRealFormSchema(program.id, program.documents);

    // "서식 칸 구조로 파싱할 후보"와 "화면에 원문으로 보여줄 파일"은 기준이 다르다.
    // 전자(loadRealFormSchema 내부)는 HWPX·ZIP 구조를 요구하는 엄격한 필터라 그대로
    // 둬야 하지만, 후자는 그냥 뷰어(RhwpPageViewer)로 보여만 주는 것이라 훨씬
    // 느슨해도 된다. 두 기준을 하나로 묶었더니, "사업 안내서"/"사업 공고문"처럼
    // 이름이 "사업계획서"/"신청서"가 아닌 첨부만 있는 공고는 실제로는 파일이
    // 있는데도(상세 페이지에서는 잘 보임) 계획서 화면에서는 볼 파일이 아예 없는
    // 것처럼 나왔다.
    const formDocuments = program.documents.filter((doc) => /사업\s*계획\s*서/i.test(doc.fileName));
    const genericDocuments = program.documents.filter((doc) => /신청서|참가신청/i.test(doc.fileName));
    const isImage = (fileName: string) => /\.(png|jpe?g|gif|bmp|webp)$/i.test(fileName);
    // 위 두 필터에 걸리는 게 없으면, 이미지가 아닌 첨부 중 아무거나(보통 공고문
    // 원문) 최소한 보여준다. 정확한 서식 매칭은 실패했다는 걸 화면 문구로 안내하되,
    // 사용자가 참고할 원문 자체는 볼 수 있게 한다.
    const fallbackDocument = program.documents.find((doc) => !isImage(doc.fileName));
    const formDocument = formDocuments[0] || genericDocuments[0] || fallbackDocument || null;

    return NextResponse.json({ success: true, schema, formDocument });
  } catch (error) {
    console.error("[PSST schema] 서식 조회 실패", error);
    return NextResponse.json({ success: false, error: "첨부 서식을 불러오지 못했습니다." }, { status: 500 });
  }
}
