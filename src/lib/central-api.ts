import "server-only";
import { headers } from "next/headers";

export type CentralApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function centralApiGet<T>(path: string): Promise<CentralApiResult<T>> {
  const base = process.env.CENTRAL_API_BASE_URL?.replace(/\/+$/, "");
  if (!base || !path.startsWith("/v1/") || path.startsWith("//")) {
    return { ok: false, error: "Central API is not configured." };
  }

  try {
    const incoming = await headers();
    const cookie = incoming.get("cookie");
    const requestHeaders = new Headers({ Accept: "application/json" });
    if (cookie) requestHeaders.set("cookie", cookie);

    const response = await fetch(new URL(path, `${base}/`), {
      method: "GET",
      headers: requestHeaders,
      cache: "no-store",
      redirect: "error",
    });
    const payload: unknown = await response.json();
    if (!response.ok || !payload || typeof payload !== "object" || !("success" in payload) || payload.success !== true || !("data" in payload)) {
      const message = payload && typeof payload === "object" && "error" in payload && payload.error && typeof payload.error === "object" && "message" in payload.error && typeof payload.error.message === "string"
        ? payload.error.message
        : "Central API request failed.";
      return { ok: false, error: message };
    }
    return { ok: true, data: payload.data as T };
  } catch {
    return { ok: false, error: "Central API is temporarily unavailable." };
  }
}
