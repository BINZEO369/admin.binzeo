import { NextRequest, NextResponse } from "next/server";
import { getAdminApiContext } from "@/lib/admin";
const AUTH_APP_URL = (process.env.AUTH_APP_URL ?? "https://auth-binzeo.vercel.app").replace(/\/+$/, "");
async function proxy(request: NextRequest, method: "GET" | "PUT") {
  const { supabase, user, access } = await getAdminApiContext();
  if (!user || !access?.is_active) return NextResponse.json({ success: false, error: { message: "Admin authentication required" } }, { status: 403 });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return NextResponse.json({ success: false, error: { message: "Admin session token unavailable" } }, { status: 401 });
  const headers = new Headers({ Authorization: `Bearer ${session.access_token}` });
  if (method === "PUT") headers.set("Content-Type", "application/json");
  const response = await fetch(`${AUTH_APP_URL}/api/admin/birthday-template`, { method, headers, body: method === "PUT" ? await request.text() : undefined, cache: "no-store" });
  return new NextResponse(response.body, { status: response.status, headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" } });
}
export async function GET(request: NextRequest) { return proxy(request, "GET"); }
export async function PUT(request: NextRequest) { return proxy(request, "PUT"); }
