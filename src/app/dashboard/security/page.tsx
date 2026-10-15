import { getAdminDataClient, requireAdminPermission } from "@/lib/admin";
import { centralApiGet } from "@/lib/central-api";

type LoginEvent = { id: string; user_id: string; login_method: string | null; login_status: string | null; ip_address: string | null; country: string | null; city: string | null; login_at: string };

export default async function SecurityPage() {
  const context = await requireAdminPermission("auth.read");
  let events: LoginEvent[] = [];
  let errorMessage = "";
  if (process.env.CENTRAL_API_ENABLED === "true") {
    const result = await centralApiGet<{ events: LoginEvent[] }>("/v1/admin/security/login-history");
    if (result.ok) events = result.data.events;
    else errorMessage = result.error;
  } else {
    const db = await getAdminDataClient(context.access);
    const result = await db.from("user_login_history").select("id,user_id,login_method,login_status,ip_address,country,city,login_at").order("login_at", { ascending: false }).limit(200);
    events = (result.data ?? []) as LoginEvent[];
    errorMessage = result.error?.message ?? "";
  }
  return <div className="content"><div className="section-head"><div><p className="eyebrow">Security</p><h2>Login history</h2><p className="muted">Recent authentication signals across the user base.</p></div><span className="badge warn">Sensitive activity</span></div>{errorMessage && <p className="error">{errorMessage}</p>}<div className="table-wrap"><table className="table"><thead><tr><th>Status</th><th>Method</th><th>User ID</th><th>Location</th><th>IP</th><th>Time</th></tr></thead><tbody>{events.map((event) => <tr key={event.id}><td><span className={`badge ${event.login_status === "success" ? "good" : "warn"}`}>{event.login_status}</span></td><td>{event.login_method || "—"}</td><td>{event.user_id}</td><td>{[event.city, event.country].filter(Boolean).join(", ") || "—"}</td><td>{event.ip_address || "—"}</td><td>{new Date(event.login_at).toLocaleString()}</td></tr>)}</tbody></table></div></div>;
}
