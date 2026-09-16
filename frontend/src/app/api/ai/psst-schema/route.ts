import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
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
    const formDocuments = program.documents.filter((doc) => /사업\s*계획\s*서/i.test(doc.fileName));
    const genericDocuments = program.documents.filter((doc) => /신청서|참가신청/i.test(doc.fileName));
    // 공고문·포스터가 뷰어에 들어가지 않도록 사업계획서/신청서만 후보로 사용한다.
    return NextResponse.json({ success: true, schema, formDocument: formDocuments[0] || genericDocuments[0] || null });
  } catch (error) {
    console.error("[PSST schema] 서식 조회 실패", error);
    return NextResponse.json({ success: false, error: "첨부 서식을 불러오지 못했습니다." }, { status: 500 });
  }
}
