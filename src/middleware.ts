import { NextResponse, type NextRequest } from "next/server";

const API_TIMEOUT_MS = 5_000;

type ApiEnvelope = {
  success?: boolean;
  data?: { service?: string; status?: string; access?: { is_active?: boolean } };
};

function centralBase(): string | null {
  const value = process.env.CENTRAL_API_BASE_URL?.trim().replace(/\/+$/, "");
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function unavailable() {
  return new NextResponse(
    "<!doctype html><html lang=\"en\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>BINZEO Admin temporarily unavailable</title><body style=\"font:16px system-ui;max-width:640px;margin:15vh auto;padding:24px;color:#111\"><h1>Central service unavailable</h1><p>The admin console requires the BINZEO Central API. Please try again shortly.</p></body></html>",
    {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Retry-After": "15",
      },
    },
  );
}

async function centralGet(base: string, path: string, cookie?: string): Promise<Response> {
  const headers = new Headers({ Accept: "application/json" });
  if (cookie) headers.set("cookie", cookie);
  return fetch(new URL(path, `${base}/`), {
    method: "GET",
    headers,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });
}

function forwardCookies(upstream: Response, downstream: NextResponse) {
  const headers = upstream.headers as Headers & { getSetCookie?: () => string[] };
  const cookies = headers.getSetCookie?.() ?? (upstream.headers.get("set-cookie") ? [upstream.headers.get("set-cookie")!] : []);
  for (const cookie of cookies) downstream.headers.append("set-cookie", cookie);
}

export async function middleware(req: NextRequest) {
  const base = centralBase();
  if (!base) return unavailable();

  try {
    const health = await centralGet(base, "/v1/health");
    const payload = await health.json() as ApiEnvelope;
    if (!health.ok || payload.success !== true || payload.data?.service !== "api.binzeo" || payload.data.status !== "ok") {
      return unavailable();
    }
  } catch {
    return unavailable();
  }

  const pathname = req.nextUrl.pathname;
  const isDashboard = pathname.startsWith("/dashboard");
  const isLogin = pathname === "/login";
  if (!isDashboard && !isLogin) return NextResponse.next();

  let adminResponse: Response;
  try {
    adminResponse = await centralGet(base, "/v1/admin/me", req.headers.get("cookie") ?? undefined);
  } catch {
    return unavailable();
  }

  if (adminResponse.status >= 500 || adminResponse.status === 429) return unavailable();
  const response = NextResponse.next();
  forwardCookies(adminResponse, response);

  if (adminResponse.ok) {
    try {
      const result = await adminResponse.json() as ApiEnvelope;
      if (result.success !== true || result.data?.access?.is_active !== true) {
        return isDashboard ? NextResponse.redirect(new URL("/login?error=not_admin", req.url)) : response;
      }
    } catch {
      return unavailable();
    }
    if (isLogin) return NextResponse.redirect(new URL("/dashboard", req.url));
    return response;
  }

  if (adminResponse.status !== 401 && adminResponse.status !== 403) return unavailable();
  if (isDashboard) return NextResponse.redirect(new URL("/login", req.url));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|.*\\..*).*)"],
};
