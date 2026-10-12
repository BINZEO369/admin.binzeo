import { getAdminDataClient, requireAdminPermission } from "@/lib/admin";
import ActiveUsers from "@/components/ActiveUsers";

export default async function UsersPage() {
  const context = await requireAdminPermission("users.read");
  const db = await getAdminDataClient(context.access);
  const { data, error } = await db.from("profiles").select("id,binzeo_user_id,display_name,username,profile_photo_url,country_code,preferred_language,created_at").eq("account_status", "active").order("created_at", { ascending: false }).limit(500);
  return <div className="content"><div className="section-head"><div><p className="eyebrow">Directory / profiles</p><h2>Active users</h2><p className="muted">Browse active user profiles as account cards and open each account for full details.</p></div><span className="badge good">Live directory</span></div>{error ? <p className="error">{error.message}</p> : <section className="explorer-block"><ActiveUsers users={data ?? []} /></section>}</div>;
}
