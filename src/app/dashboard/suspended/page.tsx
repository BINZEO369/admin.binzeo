import { requireAdminPermission } from "@/lib/admin";
import { centralApiGet } from "@/lib/central-api";
import ActiveUsers from "@/components/ActiveUsers";

type User = { id: string; binzeo_user_id: string | null; display_name: string | null; username: string | null; profile_photo_url: string | null; country_code: string | null; preferred_language: string | null; account_status?: string | null; created_at: string };

export default async function SuspendedUsersPage() {
  await requireAdminPermission("users.read");
  let users: User[] = [];
  let errorMessage = "";
  const result = await centralApiGet<{ users: User[] }>("/v1/admin/users?status=suspended");
  if (result.ok) users = result.data.users;
  else errorMessage = result.error;
  return <div className="content"><div className="section-head"><div><p className="eyebrow">Directory / account status</p><h2>Suspended users</h2><p className="muted">A separate review queue for accounts that cannot sign in while suspended.</p></div><span className="badge warn">Restricted access</span></div>{errorMessage ? <p className="error">{errorMessage}</p> : <section className="explorer-block"><ActiveUsers users={users} status="suspended" /></section>}</div>;
}
