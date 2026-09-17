import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/verify-token";
import { prisma } from "@/lib/db";

/** 이 계정이 저장해 둔 문서 목록 ("내 저장소"). */
export async function GET(req: NextRequest) {
  const auth = requireUser(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.reason }, { status: 401 });
  }

  try {
    const documents = await prisma.savedDocument.findMany({
      where: { userId: auth.user.sub },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        fileName: true,
        format: true,
        fileSize: true,
        supportProgramId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ success: true, documents });
  } catch (error: any) {
    console.error("[내 저장소] 목록 조회 실패:", error);
    return NextResponse.json({ success: false, error: "목록을 불러오지 못했습니다." }, { status: 500 });
  }
}
