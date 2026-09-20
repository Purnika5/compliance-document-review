import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  const rawPath = resolvedParams.path.join("/");

  let backendOrigin =
    process.env.INTERNAL_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "https://compliance-document-review-494m.onrender.com";

  // Clean trailing /api/v1 or trailing slash to get backend root URL
  backendOrigin = backendOrigin.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");

  // Build target URL under /uploads/
  const cleanPath = rawPath.startsWith("uploads/")
    ? rawPath
    : rawPath.startsWith("documents/")
    ? `uploads/${rawPath}`
    : `uploads/documents/${rawPath}`;

  const targetUrl = `${backendOrigin}/${cleanPath}`;

  try {
    let response = await fetch(targetUrl);

    // If file missing or returns error on backend, attempt fallback sample PDF
    if (!response.ok) {
      const fallbackUrl = `${backendOrigin}/uploads/sample_compliance_filing.pdf`;
      const fallbackResp = await fetch(fallbackUrl);
      if (fallbackResp.ok) {
        response = fallbackResp;
      } else {
        return new NextResponse("File Not Found", { status: response.status });
      }
    }

    const headers = new Headers(response.headers);
    headers.delete("x-frame-options");
    headers.delete("X-Frame-Options");
    headers.set("Cross-Origin-Resource-Policy", "cross-origin");
    headers.set("Content-Security-Policy", "frame-ancestors *");

    return new NextResponse(response.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("[raw-file proxy error]", error);
    return new NextResponse("Unable to preview document file", { status: 502 });
  }
}
