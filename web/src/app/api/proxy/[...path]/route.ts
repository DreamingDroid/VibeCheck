import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";
const PRIVATE_BACKEND_TOKEN = process.env.PRIVATE_BACKEND_TOKEN || "";

// Allowed origins for CSRF / direct bot protection
function isAllowedOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const host = req.headers.get("host");

  const allowedHosts = new Set<string>();

  if (host) {
    allowedHosts.add(host.toLowerCase());
  }

  if (process.env.NEXTAUTH_URL) {
    try {
      const parsed = new URL(process.env.NEXTAUTH_URL);
      allowedHosts.add(parsed.host.toLowerCase());
    } catch (_) {}
  }

  if (process.env.VERCEL_URL) {
    allowedHosts.add(process.env.VERCEL_URL.toLowerCase());
  }

  // Development localhost allowances
  if (process.env.NODE_ENV !== "production") {
    allowedHosts.add("localhost:3000");
    allowedHosts.add("localhost:3500");
    allowedHosts.add("localhost:4000");
    allowedHosts.add("127.0.0.1:3000");
    allowedHosts.add("127.0.0.1:3500");
  }

  const checkUrl = (urlStr: string | null): boolean => {
    if (!urlStr) return false;
    try {
      const url = new URL(urlStr);
      // In dev, any localhost or 127.0.0.1 is accepted
      if (process.env.NODE_ENV !== "production" && (url.hostname === "localhost" || url.hostname === "127.0.0.1")) {
        return true;
      }
      return allowedHosts.has(url.host.toLowerCase());
    } catch (_) {
      return false;
    }
  };

  // If origin is present, check origin
  if (origin) {
    return checkUrl(origin);
  }

  // If referer is present, check referer
  if (referer) {
    return checkUrl(referer);
  }

  // If neither origin nor referer is provided (e.g. direct cURL/Postman or scraper without headers)
  return false;
}

// Determines if a request path and method is publicly accessible without a session
function isPublicRoute(method: string, endpointPath: string): boolean {
  const normalizedPath = endpointPath.toLowerCase();

  // Public GET endpoints (Discovery, Cities, News, Settings)
  if (method === "GET") {
    if (
      normalizedPath.startsWith("/api/events") ||
      normalizedPath.startsWith("/api/cities") ||
      normalizedPath.startsWith("/api/news") ||
      normalizedPath.startsWith("/api/settings") ||
      normalizedPath === "/api/admin/settings"
    ) {
      return true;
    }
  }

  // Public OTP / Application submission endpoints
  if (method === "POST") {
    if (
      normalizedPath.startsWith("/api/apply/send-otp") ||
      normalizedPath.startsWith("/api/apply/verify-otp") ||
      normalizedPath.startsWith("/api/apply/submit") ||
      normalizedPath.startsWith("/api/verify/send-code") ||
      normalizedPath.startsWith("/api/verify/confirm-code")
    ) {
      return true;
    }
  }

  return false;
}

async function handleProxy(req: NextRequest, { params }: { params: { path: string[] } }) {
  // 1. Origin / CSRF Check
  if (!isAllowedOrigin(req)) {
    return NextResponse.json(
      { success: false, error: "Forbidden: Request origin not allowed" },
      { status: 403 }
    );
  }

  // 2. Reconstruct clean target endpoint
  const rawSegments = params.path || [];
  const cleanPath = rawSegments[0] === "api" ? rawSegments.slice(1).join("/") : rawSegments.join("/");
  const targetEndpoint = `/api/${cleanPath}`;

  // 3. Selective Authentication Check
  const method = req.method.toUpperCase();
  const isPublic = isPublicRoute(method, targetEndpoint);

  let session = null;
  if (!isPublic) {
    session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Authentication required" },
        { status: 401 }
      );
    }
  }

  // 4. Forwarding to Backend
  const searchParams = req.nextUrl.search;
  const targetUrl = `${BACKEND_URL}${targetEndpoint}${searchParams}`;

  const forwardHeaders: Record<string, string> = {
    "Authorization": `Bearer ${PRIVATE_BACKEND_TOKEN}`,
  };

  const clientIp = req.headers.get("x-forwarded-for") || req.ip || "127.0.0.1";
  forwardHeaders["X-Forwarded-For"] = clientIp;

  if (session?.user?.email) {
    forwardHeaders["X-User-Email"] = session.user.email;
  }

  const contentType = req.headers.get("content-type");
  if (contentType) {
    forwardHeaders["Content-Type"] = contentType;
  }

  const accept = req.headers.get("accept");
  if (accept) {
    forwardHeaders["Accept"] = accept;
  }

  const fetchOptions: RequestInit = {
    method,
    headers: forwardHeaders,
  };

  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    try {
      const bodyText = await req.text();
      if (bodyText) {
        fetchOptions.body = bodyText;
      }
    } catch (_) {}
  }

  try {
    const backendRes = await fetch(targetUrl, fetchOptions);
    const responseData = await backendRes.text();

    const responseHeaders = new Headers();
    const resContentType = backendRes.headers.get("content-type");
    if (resContentType) {
      responseHeaders.set("content-type", resContentType);
    }

    return new NextResponse(responseData, {
      status: backendRes.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error("[SmartProxy] Backend proxy error:", error);
    return NextResponse.json(
      { success: false, error: "Bad Gateway: Could not connect to backend service" },
      { status: 502 }
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
export const PATCH = handleProxy;
