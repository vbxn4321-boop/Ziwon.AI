import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get("url");
    const customFileName = searchParams.get("filename") || "공고첨부파일";

    if (!fileUrl || !fileUrl.startsWith("http")) {
      return NextResponse.json({ error: "Invalid or missing file URL" }, { status: 400 });
    }

    console.log(`📥 [File Download Proxy] Requesting file from: ${fileUrl}`);

    const res = await fetch(fileUrl, {
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

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

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
    console.error("File download proxy error:", error);
    return NextResponse.json({ error: error.message || "Download failed" }, { status: 500 });
  }
}
