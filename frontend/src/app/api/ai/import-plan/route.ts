import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ success: false, error: "파일을 선택해 주세요." }, { status: 400 });
    const allowed = /\.(pdf|docx|hwpx|hwp|txt)$/i.test(file.name);
    if (!allowed) return NextResponse.json({ success: false, error: "PDF, DOCX, HWPX, HWP, TXT 파일만 지원합니다." }, { status: 415 });
    const { extractTextFromBuffer } = await import("@/lib/parser/document-parser");
    const text = await extractTextFromBuffer(Buffer.from(await file.arrayBuffer()), file.name);
    return NextResponse.json({ success: true, fileName: file.name, text: text.slice(0, 120000) });
  } catch (error) {
    console.error("[PSST import] 기존 계획서 분석 실패", error);
    return NextResponse.json({ success: false, error: "기존 사업계획서를 읽지 못했습니다." }, { status: 500 });
  }
}
