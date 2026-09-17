import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  const filePath = resolvedParams.path.join("/");
  const backendUrl =
    process.env.INTERNAL_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://compliance-backend:5000";

  const targetUrl = `${backendUrl}/uploads/${filePath}`;

  try {
    const response = await fetch(targetUrl);
    if (!response.ok) {
      return new NextResponse(response.statusText, { status: response.status });
    }

    const headers = new Headers(response.headers);
    headers.delete("x-frame-options");
    headers.delete("X-Frame-Options");
    headers.set("Cross-Origin-Resource-Policy", "cross-origin");
    headers.set("Content-Security-Policy", "frame-ancestors *");

    return new NextResponse(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error("[raw-file proxy error]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
