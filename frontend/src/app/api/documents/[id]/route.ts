import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/verify-token";
import { prisma } from "@/lib/db";

const CONTENT_TYPE: Record<string, string> = {
  hwpx: "application/vnd.hancom.hwpx",
  hwp: "application/x-hwp",
  pdf: "application/pdf",
};

/**
 * 저장된 문서 바이트를 그대로 내려준다.
 *
 * 별도 오브젝트 스토리지가 없으므로 서명 URL을 발급하는 대신, 이 라우트
 * 자체가 파일 응답이 된다 — rhwp 에디터의 loadFile()에 바로 넘길 수 있다.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.reason }, { status: 401 });
  }

  try {
    const { id } = await params;
    const doc = await prisma.savedDocument.findUnique({ where: { id } });
    if (!doc || doc.userId !== auth.user.sub) {
      return NextResponse.json({ success: false, error: "문서를 찾을 수 없습니다." }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(doc.content), {
      status: 200,
      headers: {
        "Content-Type": CONTENT_TYPE[doc.format] || "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`,
        "Content-Length": String(doc.content.length),
      },
    });
  } catch (error: any) {
    console.error("[내 저장소] 조회 실패:", error);
    return NextResponse.json({ success: false, error: "문서를 불러오지 못했습니다." }, { status: 500 });
  }
}

/** 저장된 문서를 삭제한다. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.reason }, { status: 401 });
  }

  try {
    const { id } = await params;
    const doc = await prisma.savedDocument.findUnique({ where: { id }, select: { userId: true } });
    if (!doc || doc.userId !== auth.user.sub) {
      return NextResponse.json({ success: false, error: "문서를 찾을 수 없습니다." }, { status: 404 });
    }

    await prisma.savedDocument.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[내 저장소] 삭제 실패:", error);
    return NextResponse.json({ success: false, error: "문서를 삭제하지 못했습니다." }, { status: 500 });
  }
}
