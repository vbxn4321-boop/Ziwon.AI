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
    // 편집기(rhwp)는 HWP 5.0/HWPX 계열만 열 수 있다 (PDF, DOCX, XLSX, ZIP, 이미지는
    // 지원 밖 — 열면 "지원하지 않는 포맷입니다" 에러가 뜬다). "사업계획서.pdf"처럼
    // 이름은 그럴듯해도 포맷이 안 맞으면 편집 후보에서 아예 제외한다. 대신 이런
    // 파일은 unopenableDocuments 로 따로 내려서, 화면에서 "원문 새 탭으로 보기"
    // 링크로 안내한다 — 조용히 사라지면 사용자가 그 첨부의 존재 자체를 모르게 된다.
    const isHwpFamily = (doc: { fileType: string; fileName: string }) =>
      doc.fileType === "HWPX" || doc.fileType === "HWP" || /\.hwpx?$/i.test(doc.fileName);
    const isImage = (fileName: string) => /\.(png|jpe?g|gif|bmp|webp)$/i.test(fileName);
    const editableDocs = program.documents.filter(isHwpFamily);
    const unopenableDocuments = program.documents.filter(
      (doc) => !isHwpFamily(doc) && !isImage(doc.fileName)
    );

    const businessPlanDocs = editableDocs.filter((doc) => /사업\s*계획\s*서/i.test(doc.fileName));
    const applicationDocs = editableDocs.filter(
      (doc) => !businessPlanDocs.includes(doc) && /신청서|참가신청/i.test(doc.fileName)
    );
    // 위 두 분류에 안 걸리는 나머지도 후보에 넣는다 (여전히 HWP/HWPX로 한정).
    const otherDocs = editableDocs.filter(
      (doc) => !businessPlanDocs.includes(doc) && !applicationDocs.includes(doc)
    );

    // 실측(2026-09-21): 신청서·사업계획서로 잡히는 첨부가 2개 이상인 공고가
    // 129건 있었다 — 세부 사업별로 서로 완전히 다른 신청서가 여러 개거나
    // (예: 인력양성/시험인증/구조고도화 신청서가 각각 별도 파일), 같은 서식이
    // hwpx/hwp/pdf 세 포맷으로 중복 첨부된 경우다. 예전엔 [0]으로 하나만
    // 골라 나머지를 조용히 버렸다 — 첨부가 여러 개인데 하나만 뜨는 것처럼
    // 보이는 버그였다. 이제 후보 전체를 formDocuments 로 내려주고, 화면에서
    // 골라 볼 수 있게 한다. formDocument(단수)는 그대로 두어 하위 호환한다 —
    // 우선순위상 가장 그럴듯한 첫 후보를 기본 선택값으로 쓴다.
    const formDocuments = [...businessPlanDocs, ...applicationDocs, ...otherDocs];
    const formDocument = formDocuments[0] || null;

    return NextResponse.json({ success: true, schema, formDocument, formDocuments, unopenableDocuments });
  } catch (error) {
    console.error("[PSST schema] 서식 조회 실패", error);
    return NextResponse.json({ success: false, error: "첨부 서식을 불러오지 못했습니다." }, { status: 500 });
  }
}
