import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/verify-token";
import { prisma } from "@/lib/db";
import { getSupabaseAdmin, USER_DOCUMENTS_BUCKET } from "@/lib/storage/supabase-admin";

/** 저장된 문서를 다시 불러올 서명 URL을 내준다. 짧게(60초) 열어 링크가 새 나가도 오래 살지 않게 한다. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireUser(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.reason }, { status: 401 });
  }

  try {
    const { id } = await params;
    const doc = await prisma.savedDocument.findUnique({ where: { id } });
    if (!doc || doc.userId !== auth.user.sub) {
      return NextResponse.json({ success: false, error: "문서를 찾을 수 없습니다." }, { status: 404 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage
      .from(USER_DOCUMENTS_BUCKET)
      .createSignedUrl(doc.storagePath, 60);
    if (error || !data) {
      console.error("[내 저장소] 서명 URL 발급 실패:", error?.message);
      return NextResponse.json({ success: false, error: "파일을 불러오지 못했습니다." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      url: data.signedUrl,
      fileName: doc.fileName,
      format: doc.format,
    });
  } catch (error: any) {
    console.error("[내 저장소] 조회 실패:", error);
    return NextResponse.json({ success: false, error: "문서를 불러오지 못했습니다." }, { status: 500 });
  }
}

/** 저장된 문서를 삭제한다. Storage 객체와 DB 행을 함께 지운다. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireUser(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.reason }, { status: 401 });
  }

  try {
    const { id } = await params;
    const doc = await prisma.savedDocument.findUnique({ where: { id } });
    if (!doc || doc.userId !== auth.user.sub) {
      return NextResponse.json({ success: false, error: "문서를 찾을 수 없습니다." }, { status: 404 });
    }

    const supabase = getSupabaseAdmin();
    const { error: removeError } = await supabase.storage
      .from(USER_DOCUMENTS_BUCKET)
      .remove([doc.storagePath]);
    if (removeError) {
      // Storage 삭제가 실패해도 DB 행은 지운다 — 목록에 죽은 항목이 남는 것보다,
      // 버킷에 안 쓰는 파일 하나 남는 게 사용자에게 덜 나쁘다.
      console.warn("[내 저장소] Storage 객체 삭제 실패(무시하고 진행):", removeError.message);
    }

    await prisma.savedDocument.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[내 저장소] 삭제 실패:", error);
    return NextResponse.json({ success: false, error: "문서를 삭제하지 못했습니다." }, { status: 500 });
  }
}
