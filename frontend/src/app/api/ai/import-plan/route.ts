import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/verify-token";
import { validateUploadedDocument, MAX_UPLOAD_BYTES } from "@/lib/parser/upload-validator";
import { maskPersonalInfo } from "@/lib/parser/notice-extractor";

export const maxDuration = 60;

const MAX_RETURN_CHARS = 120_000;

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication check
    const auth = await requireUser(req);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.reason }, { status: 401 });
    }

    // 2. Parse FormData
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "파일을 선택해 주세요." }, { status: 400 });
    }

    // 3. Early size check before reading full buffer
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `파일 크기가 15MB를 초과했습니다 (현재 ${(file.size / 1024 / 1024).toFixed(1)}MB).`,
        },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. Strict structural and magic-byte validation
    const validation = validateUploadedDocument(buffer, file.name);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: validation.statusCode }
      );
    }

    // 5. Extract text
    const { extractTextFromBuffer } = await import("@/lib/parser/document-parser");
    const rawText = await extractTextFromBuffer(buffer, file.name);

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "문서에서 텍스트를 추출하지 못했습니다. 암호화되었거나 스캔 이미지 형태의 문서인지 확인해 주세요.",
        },
        { status: 422 }
      );
    }

    // 6. Privacy masking (masking resident numbers, phone numbers, emails, etc.)
    const { text: maskedText, maskedCount } = maskPersonalInfo(rawText);

    // 7. Safe length truncation and metadata
    const truncated = maskedText.length > MAX_RETURN_CHARS;
    const finalText = truncated ? maskedText.slice(0, MAX_RETURN_CHARS) : maskedText;

    return NextResponse.json({
      success: true,
      fileName: file.name,
      docType: validation.docType,
      text: finalText,
      originalCharacters: rawText.length,
      returnedCharacters: finalText.length,
      truncated,
      maskedCount,
    });
  } catch (error: any) {
    console.error("[PSST import] 기존 계획서 분석 실패:", error);
    return NextResponse.json(
      { success: false, error: "기존 사업계획서를 처리하지 못했습니다." },
      { status: 500 }
    );
  }
}
