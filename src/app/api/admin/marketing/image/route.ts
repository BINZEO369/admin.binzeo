import { NextRequest, NextResponse } from "next/server";
import { getAdminApiContext } from "@/lib/admin";
const AUTH_APP_URL = (process.env.AUTH_APP_URL ?? "https://auth-binzeo.vercel.app").replace(/\/+$/, "");
export async function POST(request: NextRequest) {
  const { supabase, user, access } = await getAdminApiContext();
  if (!user || !access?.is_active) return NextResponse.json({ success: false, error: { message: "Admin authentication required", code: "ADMIN_REQUIRED" } }, { status: 403 });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return NextResponse.json({ success: false, error: { message: "Admin session token unavailable", code: "SESSION_TOKEN_REQUIRED" } }, { status: 401 });
  const response = await fetch(`${AUTH_APP_URL}/api/admin/marketing/image`, { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": request.headers.get("content-type") ?? "application/octet-stream" }, body: await request.arrayBuffer(), cache: "no-store" });
  return new NextResponse(response.body, { status: response.status, headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" } });
}
