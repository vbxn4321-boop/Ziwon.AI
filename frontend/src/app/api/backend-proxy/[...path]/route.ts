import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_API_URL ||
  "https://ziwonai-production.up.railway.app/api/v1";

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, await params);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, await params);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, await params);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, await params);
}

async function handleProxy(req: NextRequest, params: { path: string[] }) {
  try {
    const subPath = (params.path || []).join("/");
    const url = new URL(req.url);
    const targetUrl = `${BACKEND_URL}/${subPath}${url.search}`;

    const headers: Record<string, string> = {};
    req.headers.forEach((val, key) => {
      if (key.toLowerCase() !== "host" && key.toLowerCase() !== "connection") {
        headers[key] = val;
      }
    });

    let body: any = undefined;
    if (req.method !== "GET" && req.method !== "HEAD") {
      try {
        body = await req.text();
      } catch {}
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      signal: AbortSignal.timeout(30000),
    });

    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Backend communication error", detail: err.message },
      { status: 502 }
    );
  }
}
