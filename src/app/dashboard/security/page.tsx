import { requireAdminPermission } from "@/lib/admin";
import { centralApiGet } from "@/lib/central-api";

type LoginEvent = { id: string; user_id: string; login_method: string | null; login_status: string | null; ip_address: string | null; country: string | null; city: string | null; login_at: string };

export default async function SecurityPage() {
  await requireAdminPermission("auth.read");
  let events: LoginEvent[] = [];
  let errorMessage = "";
  const result = await centralApiGet<{ events: LoginEvent[] }>("/v1/admin/security/login-history");
  if (result.ok) events = result.data.events;
  else errorMessage = result.error;
  return <div className="content"><div className="section-head"><div><p className="eyebrow">Security</p><h2>Login history</h2><p className="muted">Recent authentication signals across the user base.</p></div><span className="badge warn">Sensitive activity</span></div>{errorMessage && <p className="error">{errorMessage}</p>}<div className="table-wrap"><table className="table"><thead><tr><th>Status</th><th>Method</th><th>User ID</th><th>Location</th><th>IP</th><th>Time</th></tr></thead><tbody>{events.map((event) => <tr key={event.id}><td><span className={`badge ${event.login_status === "success" ? "good" : "warn"}`}>{event.login_status}</span></td><td>{event.login_method || "—"}</td><td>{event.user_id}</td><td>{[event.city, event.country].filter(Boolean).join(", ") || "—"}</td><td>{event.ip_address || "—"}</td><td>{new Date(event.login_at).toLocaleString()}</td></tr>)}</tbody></table></div></div>;
}
