import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireUser } from "@/lib/auth/verify-token";
import { prisma } from "@/lib/db";

export const maxDuration = 30;

/** base64 인코딩 전 원본 바이트 상한. HWPX 계획서는 보통 수백 KB대라 여유를 둔다. */
const MAX_BYTES = 15 * 1024 * 1024;

/** 목록·저장 응답에 매번 파일 바이트를 실어 보내지 않기 위한 공통 select. */
const DOCUMENT_META_SELECT = {
  id: true,
  fileName: true,
  format: true,
  fileSize: true,
  supportProgramId: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * rhwp 에디터에서 편집한 문서를 사용자 계정에 저장한다.
 *
 * 별도 오브젝트 스토리지(서비스 롤 키·버킷) 없이 바이트를 그대로 DB 컬럼에
 * 담는다. `id`를 함께 보내면 같은 문서를 덮어써 갱신하고(재저장), 없으면
 * 새로 만든다.
 */
export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.reason }, { status: 401 });
  }
  const userId = auth.user.sub;

  try {
    const body = await req.json();
    const { fileName, format, contentBase64, supportProgramId, id: existingId } = body || {};

    if (!fileName || typeof fileName !== "string") {
      return NextResponse.json({ success: false, error: "fileName이 필요합니다." }, { status: 400 });
    }
    if (format !== "hwp" && format !== "hwpx" && format !== "pdf") {
      return NextResponse.json({ success: false, error: "format은 hwp, hwpx, pdf 중 하나여야 합니다." }, { status: 400 });
    }
    if (!contentBase64 || typeof contentBase64 !== "string") {
      return NextResponse.json({ success: false, error: "contentBase64가 필요합니다." }, { status: 400 });
    }

    // 이 계정 소유가 아닌 id로 덮어쓰려는 시도를 막는다.
    if (existingId) {
      const existing = await prisma.savedDocument.findUnique({
        where: { id: existingId },
        select: { userId: true },
      });
      if (existing && existing.userId !== userId) {
        return NextResponse.json({ success: false, error: "이 문서에 대한 권한이 없습니다." }, { status: 403 });
      }
    }

    const bytes = Buffer.from(contentBase64, "base64");
    if (bytes.length === 0) {
      return NextResponse.json({ success: false, error: "빈 파일은 저장할 수 없습니다." }, { status: 400 });
    }
    if (bytes.length > MAX_BYTES) {
      return NextResponse.json(
        { success: false, error: `파일이 너무 큽니다 (최대 ${MAX_BYTES / 1024 / 1024}MB).` },
        { status: 413 }
      );
    }

    const id = existingId || randomUUID();

    const saved = await prisma.savedDocument.upsert({
      where: { id },
      update: { fileName, fileSize: bytes.length, format, content: bytes },
      create: {
        id,
        userId,
        fileName,
        fileSize: bytes.length,
        format,
        content: bytes,
        supportProgramId: supportProgramId || null,
      },
      select: DOCUMENT_META_SELECT,
    });

    return NextResponse.json({ success: true, document: saved });
  } catch (error: any) {
    console.error("[문서 저장] 실패:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "문서를 저장하지 못했습니다." },
      { status: 500 }
    );
  }
}
