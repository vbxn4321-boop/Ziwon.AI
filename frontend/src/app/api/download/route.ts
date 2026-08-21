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
    if (fileName.toLowerCase().endsWith(".pdf")) contentType = "application/pdf";
    if (fileName.toLowerCase().endsWith(".hwp")) contentType = "application/x-hwp";
    if (fileName.toLowerCase().endsWith(".hwpx")) contentType = "application/hwp+zip";
    if (fileName.toLowerCase().endsWith(".docx")) contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    // Determine Content-Disposition (inline for PDF viewer, attachment for download)
    const isViewMode = searchParams.get("view") === "true" || searchParams.get("inline") === "true";
    const dispositionType = isViewMode && contentType === "application/pdf" ? "inline" : "attachment";

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
