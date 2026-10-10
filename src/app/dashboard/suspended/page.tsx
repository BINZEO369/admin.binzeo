import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import ActiveUsers from "@/components/ActiveUsers";

export default async function SuspendedUsersPage() {
  await requireAdmin();
  const db = await createClient();
  const { data, error } = await db.from("profiles").select("id,binzeo_user_id,display_name,username,profile_photo_url,country_code,preferred_language,account_status,created_at").eq("account_status", "suspended").order("suspended_at", { ascending: false }).limit(500);
  return <div className="content"><div className="section-head"><div><p className="eyebrow">Directory / account status</p><h2>Suspended users</h2><p className="muted">A separate review queue for accounts that cannot sign in while suspended.</p></div><span className="badge warn">Restricted access</span></div>{error ? <p className="error">{error.message}</p> : <section className="explorer-block"><ActiveUsers users={data ?? []} status="suspended" /></section>}</div>;
}
