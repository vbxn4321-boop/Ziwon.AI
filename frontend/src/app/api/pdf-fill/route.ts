import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { safeFetch, BlockedUrlError } from "@/lib/security/safe-fetch";
import { extractZipEntry } from "@/lib/parser/document-parser";

export const maxDuration = 30;
export const runtime = "nodejs";

/**
 * 공고 PDF 서식은 대부분 채워 넣을 필드(AcroForm)가 없는 "출력·수기 작성용" 문서다
 * (실측: 표본 3건 모두 필드 0개). 그래서 원본 좌표 위에 사용자가 직접 배치한
 * 텍스트를 그려 넣는 방식으로 채운다 — 서식마다 제각각이라 관리자가 미리 좌표를
 * 잡아두는 건 불가능하므로, 좌표는 지금 이 문서를 채우는 사용자가 화면에서
 * 직접 정한 값을 그대로 받는다.
 */

const FONT_PATH = path.join(process.cwd(), "src/lib/export/fonts/NanumGothic-Regular.ttf");

interface TextBoxInput {
  page: number;
  /** 0~1, 페이지 왼쪽 기준 */
  xPct: number;
  /** 0~1, 페이지 위쪽 기준 (화면 좌표계와 동일하게 위에서부터) */
  yPct: number;
  fontSizePt: number;
  text: string;
}

const MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024;
const MAX_BOXES = 200;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fileUrl, entryPath, boxes } = body as {
      fileUrl?: string;
      entryPath?: string | null;
      boxes?: TextBoxInput[];
    };

    if (!fileUrl) {
      return NextResponse.json({ error: "fileUrl이 필요합니다." }, { status: 400 });
    }
    if (!Array.isArray(boxes) || boxes.length === 0) {
      return NextResponse.json({ error: "입력한 내용이 없습니다." }, { status: 400 });
    }
    if (boxes.length > MAX_BOXES) {
      return NextResponse.json({ error: "입력 칸이 너무 많습니다." }, { status: 400 });
    }

    const res = await safeFetch(fileUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://www.bizinfo.go.kr",
      },
    });
    if (!res.ok) {
      return NextResponse.json({ error: `원본 서식을 불러오지 못했습니다 (HTTP ${res.status})` }, { status: 502 });
    }

    let buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > MAX_DOWNLOAD_BYTES) {
      return NextResponse.json({ error: "원본 파일이 너무 큽니다." }, { status: 413 });
    }

    if (entryPath) {
      const entry = extractZipEntry(buffer, entryPath);
      if (!entry) {
        return NextResponse.json({ error: "압축 파일에서 서식을 찾지 못했습니다." }, { status: 404 });
      }
      // adm-zip 이 돌려주는 Buffer 도 항상 ArrayBuffer 기반이라 타입만 좁힌다 (download route와 동일 패턴)
      buffer = entry as Buffer<ArrayBuffer>;
    }

    const pdfDoc = await PDFDocument.load(buffer);
    pdfDoc.registerFontkit(fontkit);
    const fontBytes = fs.readFileSync(FONT_PATH);
    // subset: 실제 쓰인 글자만 담아 파일 크기를 줄인다.
    const font = await pdfDoc.embedFont(fontBytes, { subset: true });

    const pages = pdfDoc.getPages();
    for (const box of boxes) {
      const page = pages[box.page];
      if (!page || typeof box.text !== "string" || !box.text.trim()) continue;

      const { width, height } = page.getSize();
      const fontSize = Math.max(6, Math.min(72, Number(box.fontSizePt) || 11));
      const x = Math.max(0, Math.min(1, Number(box.xPct) || 0)) * width;
      const topY = Math.max(0, Math.min(1, Number(box.yPct) || 0)) * height;

      const lines = box.text.split("\n").slice(0, 20);
      lines.forEach((line, i) => {
        // PDF 좌표는 왼쪽 아래가 원점이라, 화면(위에서부터)의 topY를 뒤집어 준다.
        const y = height - topY - fontSize * (i + 1) * 1.25;
        if (y < 0 || y > height) return;
        page.drawText(line.slice(0, 500), { x, y, size: fontSize, font, color: rgb(0.07, 0.07, 0.15) });
      });
    }

    const outBytes = await pdfDoc.save();
    return new NextResponse(new Uint8Array(outBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(outBytes.length),
      },
    });
  } catch (error: any) {
    if (error instanceof BlockedUrlError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[PDF Fill] 실패:", error);
    return NextResponse.json({ error: error.message || "서식 작성에 실패했습니다." }, { status: 500 });
  }
}
