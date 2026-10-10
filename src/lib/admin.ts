import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AdminContext = { user: { id:string; email?:string }; profile: Record<string, unknown> | null; access: { roles:string[]; permissions:string[]; is_active:boolean } };

export async function requireAdmin(): Promise<AdminContext> {
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: access } = await supabase.from("admin_access").select("roles, permissions, is_active").eq("user_id", user.id).maybeSingle();
  if (!access?.is_active) redirect("/login?error=not_admin");
  const { data: profile } = await supabase.from("profiles").select("id, binzeo_user_id, display_name, username, account_status, profile_photo_url").eq("id", user.id).maybeSingle();
  return { user: { id:user.id, email:user.email }, profile, access:{ roles:access.roles ?? [], permissions:Array.isArray(access.permissions) ? access.permissions : [], is_active:access.is_active } };
}

export async function getAdminApiContext() {
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user:null, access:null };
  const { data: access } = await supabase.from("admin_access").select("roles, permissions, is_active").eq("user_id", user.id).maybeSingle();
  if (!access?.is_active) return { supabase, user:null, access:null };
  return { supabase, user, access };
}
