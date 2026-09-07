import { NextRequest, NextResponse } from "next/server";
import AdmZip from "adm-zip";
import {
  buildHwpxVersionXml,
  buildHwpxSettingsXml,
  buildHwpxManifestXml,
  buildHwpxContentHpfXml,
  buildHwpxHeaderXml,
  buildHwpxSectionXml,
} from "@/lib/export/hwpx-generator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { plan, programTitle, fileName } = body;

    if (!plan) {
      return NextResponse.json({ error: "사업계획서 데이터가 누락되었습니다." }, { status: 400 });
    }

    const zip = new AdmZip();

    const headerXml = Buffer.from(buildHwpxHeaderXml(), "utf-8");
    const section0Xml = Buffer.from(buildHwpxSectionXml(plan, programTitle), "utf-8");

    // 1. Root and Meta files
    zip.addFile("version.xml", Buffer.from(buildHwpxVersionXml(), "utf-8"));
    zip.addFile("settings.xml", Buffer.from(buildHwpxSettingsXml(), "utf-8"));
    zip.addFile("META-INF/manifest.xml", Buffer.from(buildHwpxManifestXml(), "utf-8"));

    // 2. Contents folder & compatibility root aliases
    zip.addFile("Contents/content.hpf", Buffer.from(buildHwpxContentHpfXml(), "utf-8"));
    zip.addFile("Contents/header.xml", headerXml);
    zip.addFile("Contents/section0.xml", section0Xml);
    zip.addFile("header.xml", headerXml);
    zip.addFile("section0.xml", section0Xml);

    const zipBuffer = zip.toBuffer();
    const outFileName = encodeURIComponent(
      (fileName || `${plan?.overview?.title || "PSST_사업계획서"}`).replace(/[/\\?%*:|"<>]/g, "_")
    );

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/hwp+zip",
        "Content-Disposition": `attachment; filename="${outFileName}.hwpx"; filename*=UTF-8''${outFileName}.hwpx`,
        "Content-Length": zipBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("[HWPX Export API Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate HWPX document" },
      { status: 500 }
    );
  }
}
