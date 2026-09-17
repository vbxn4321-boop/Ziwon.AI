import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireUser } from "@/lib/auth/verify-token";
import { prisma } from "@/lib/db";
import { getSupabaseAdmin, USER_DOCUMENTS_BUCKET } from "@/lib/storage/supabase-admin";

export const maxDuration = 30;

/** base64 인코딩 전 원본 바이트 상한. HWPX 계획서는 보통 수백 KB대라 여유를 둔다. */
const MAX_BYTES = 15 * 1024 * 1024;

/**
 * rhwp 에디터에서 편집한 문서를 사용자 계정 저장소에 저장한다.
 *
 * 바이트는 Supabase Storage에, 메타데이터는 `SavedDocument`에 남긴다.
 * `id`를 함께 보내면 같은 문서를 덮어써 갱신하고(재저장), 없으면 새로 만든다.
 */
export async function POST(req: NextRequest) {
  const auth = requireUser(req);
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
    if (format !== "hwp" && format !== "hwpx") {
      return NextResponse.json({ success: false, error: "format은 hwp 또는 hwpx여야 합니다." }, { status: 400 });
    }
    if (!contentBase64 || typeof contentBase64 !== "string") {
      return NextResponse.json({ success: false, error: "contentBase64가 필요합니다." }, { status: 400 });
    }

    // 이 계정 소유가 아닌 id로 덮어쓰려는 시도를 막는다.
    if (existingId) {
      const existing = await prisma.savedDocument.findUnique({ where: { id: existingId } });
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
    const storagePath = `${userId}/${id}.${format}`;

    const supabase = getSupabaseAdmin();
    const { error: uploadError } = await supabase.storage
      .from(USER_DOCUMENTS_BUCKET)
      .upload(storagePath, bytes, {
        contentType: format === "hwpx" ? "application/vnd.hancom.hwpx" : "application/x-hwp",
        upsert: true,
      });
    if (uploadError) {
      console.error("[문서 저장] Storage 업로드 실패:", uploadError.message);
      return NextResponse.json({ success: false, error: "저장소 업로드에 실패했습니다." }, { status: 500 });
    }

    const saved = await prisma.savedDocument.upsert({
      where: { id },
      update: { fileName, fileSize: bytes.length, format, storagePath },
      create: {
        id,
        userId,
        fileName,
        fileSize: bytes.length,
        format,
        storagePath,
        supportProgramId: supportProgramId || null,
      },
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
