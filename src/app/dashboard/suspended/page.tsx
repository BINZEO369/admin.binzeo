import { getAdminDataClient, requireAdminPermission } from "@/lib/admin";
import { centralApiGet } from "@/lib/central-api";
import ActiveUsers from "@/components/ActiveUsers";

type User = { id: string; binzeo_user_id: string | null; display_name: string | null; username: string | null; profile_photo_url: string | null; country_code: string | null; preferred_language: string | null; account_status?: string | null; created_at: string };

export default async function SuspendedUsersPage() {
  const context = await requireAdminPermission("users.read");
  let users: User[] = [];
  let errorMessage = "";
  if (process.env.CENTRAL_API_ENABLED === "true") {
    const result = await centralApiGet<{ users: User[] }>("/v1/admin/users?status=suspended");
    if (result.ok) users = result.data.users;
    else errorMessage = result.error;
  } else {
    const db = await getAdminDataClient(context.access);
    const { data, error } = await db.from("profiles").select("id,binzeo_user_id,display_name,username,profile_photo_url,country_code,preferred_language,account_status,created_at").eq("account_status", "suspended").order("suspended_at", { ascending: false }).limit(500);
    users = (data ?? []) as User[];
    errorMessage = error?.message ?? "";
  }
  return <div className="content"><div className="section-head"><div><p className="eyebrow">Directory / account status</p><h2>Suspended users</h2><p className="muted">A separate review queue for accounts that cannot sign in while suspended.</p></div><span className="badge warn">Restricted access</span></div>{errorMessage ? <p className="error">{errorMessage}</p> : <section className="explorer-block"><ActiveUsers users={users} status="suspended" /></section>}</div>;
}
