import { NextRequest, NextResponse } from "next/server";
import { safeFetch, BlockedUrlError } from "@/lib/security/safe-fetch";

export const maxDuration = 30;
// dns 모듈을 사용하므로 Node 런타임이 필요합니다(Edge 불가).
export const runtime = "nodejs";

// 공고 첨부문서 기준 널널한 상한. 응답 전체를 메모리에 올리므로 상한이 필요합니다.
const MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get("url");
    const customFileName = searchParams.get("filename") || "공고첨부파일";

    if (!fileUrl) {
      return NextResponse.json({ error: "Invalid or missing file URL" }, { status: 400 });
    }

    console.log(`📥 [File Download Proxy] Requesting file from: ${fileUrl}`);

    // safeFetch 가 프로토콜·목적지 IP를 검증하고, 리다이렉트를 홈마다 재검증합니다.
    const res = await safeFetch(fileUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://www.bizinfo.go.kr",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Remote server responded with HTTP ${res.status}` },
        { status: res.status }
      );
    }

    const declaredLength = Number(res.headers.get("content-length") || 0);
    if (declaredLength > MAX_DOWNLOAD_BYTES) {
      return NextResponse.json(
        { error: "파일이 너무 큽니다. 원문 사이트에서 직접 내려받아 주세요." },
        { status: 413 }
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Content-Length 를 안 주는 서버가 많아 실제 크기로 한 번 더 확인
    if (buffer.length > MAX_DOWNLOAD_BYTES) {
      return NextResponse.json(
        { error: "파일이 너무 큽니다. 원문 사이트에서 직접 내려받아 주세요." },
        { status: 413 }
      );
    }

    // Extract filename from remote header if available
    let fileName = customFileName;
    const contentDisp = res.headers.get("content-disposition");
    if (contentDisp) {
      const match = contentDisp.match(/filename\*?=(?:UTF-8'')?([^;]+)/i);
      if (match) {
        try {
          fileName = decodeURIComponent(match[1].replace(/["']/g, "")).replace(/\+/g, " ");
        } catch {
          fileName = match[1].replace(/["']/g, "");
        }
      }
    }

    // Determine contentType
    let contentType = res.headers.get("content-type") || "application/octet-stream";
    const lowerName = fileName.toLowerCase();
    if (lowerName.endsWith(".pdf")) contentType = "application/pdf";
    else if (lowerName.endsWith(".png")) contentType = "image/png";
    else if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) contentType = "image/jpeg";
    else if (lowerName.endsWith(".gif")) contentType = "image/gif";
    else if (lowerName.endsWith(".webp")) contentType = "image/webp";
    else if (lowerName.endsWith(".hwp")) contentType = "application/x-hwp";
    else if (lowerName.endsWith(".hwpx")) contentType = "application/hwp+zip";
    else if (lowerName.endsWith(".docx")) contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    // Determine Content-Disposition (inline for PDF & image viewer, attachment for download)
    const isViewMode = searchParams.get("view") === "true" || searchParams.get("inline") === "true";
    const isInlineSupported = contentType === "application/pdf" || contentType.startsWith("image/");
    const dispositionType = isViewMode && isInlineSupported ? "inline" : "attachment";

    // Encode filename for RFC 5987 standard
    const encodedFileName = encodeURIComponent(fileName);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `${dispositionType}; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error: any) {
    if (error instanceof BlockedUrlError) {
      console.warn("[File Download Proxy] Blocked URL:", error.message);
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("File download proxy error:", error);
    return NextResponse.json({ error: error.message || "Download failed" }, { status: 500 });
  }
}
