import { NextRequest } from "next/server";
import { getAdminApiContext } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail } from "@/lib/api/response";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedRoles = ["support_admin", "auditor"] as const;
type AssignableRole = typeof allowedRoles[number];

function isSuperAdmin(access: { roles?: unknown } | null) {
  return Array.isArray(access?.roles) && access.roles.includes("super_admin");
}

export async function GET() {
  const { supabase, user, access } = await getAdminApiContext();
  if (!user || !access) return fail("Forbidden", 403, "ADMIN_REQUIRED");
  if (!isSuperAdmin(access)) return fail("Super admin access required", 403, "SUPER_ADMIN_REQUIRED");
  const [{ data: profiles, error: profilesError }, { data: assignments, error: assignmentsError }] = await Promise.all([
    supabase.from("profiles").select("id,binzeo_user_id,display_name,username,account_status,profile_photo_url").order("display_name").limit(500),
    supabase.from("admin_access").select("user_id,roles,permissions,is_active,assigned_by,created_at").limit(500),
  ]);
  if (profilesError || assignmentsError) return fail((profilesError ?? assignmentsError)?.message ?? "Could not load admin candidates", 400, "ADMIN_CANDIDATES_FAILED");
  return ok({ candidates: profiles ?? [], assignments: assignments ?? [] });
}

export async function POST(req: NextRequest) {
  const { supabase, user, access } = await getAdminApiContext();
  if (!user || !access) return fail("Forbidden", 403, "ADMIN_REQUIRED");
  if (!isSuperAdmin(access)) return fail("Super admin access required", 403, "SUPER_ADMIN_REQUIRED");
  let body: { user_id?: unknown; role?: unknown };
  try { body = await req.json(); } catch { return fail("Invalid JSON body", 422, "VALIDATION_ERROR"); }
  const targetUserId = body.user_id;
  const role = body.role;
  if (typeof targetUserId !== "string" || !UUID.test(targetUserId) || !allowedRoles.includes(role as AssignableRole)) {
    return fail("A valid user_id and assignable role are required", 422, "VALIDATION_ERROR");
  }
  if (targetUserId === user.id) return fail("You are already an administrator", 422, "SELF_ASSIGNMENT_NOT_ALLOWED");
  const { data: target, error: targetError } = await supabase.from("profiles").select("id,display_name,binzeo_user_id").eq("id", targetUserId).maybeSingle();
  if (targetError || !target) return fail("User profile not found", 404, "USER_NOT_FOUND");

  const permissions = role === "support_admin"
    ? ["users.read", "users.manage", "audit.read"]
    : ["audit.read"];
  const admin = createAdminClient();
  const assignmentPayload = {
    user_id: targetUserId,
    roles: [role],
    permissions,
    is_active: true,
    assigned_by: user.id,
    updated_at: new Date().toISOString(),
  };
  const { data: assignment, error } = await admin.from("admin_access").upsert([assignmentPayload] as never, { onConflict: "user_id" }).select("user_id,roles,permissions,is_active,assigned_by,updated_at").single();
  if (error) return fail(error.message, 400, "ADMIN_ASSIGNMENT_FAILED");
  await admin.from("admin_activity_logs").insert([{
    admin_user_id: user.id,
    action_type: "admin_assigned",
    target_type: "user",
    target_id: targetUserId,
    description: `Assigned ${role} to ${target.display_name ?? target.binzeo_user_id ?? targetUserId}`,
    metadata: { role, permissions },
  }] as never);
  return ok({ assignment });
}
