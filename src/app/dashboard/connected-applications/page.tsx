import { requireAdminPermission } from "@/lib/admin";
import { centralApiGet } from "@/lib/central-api";

type AccessEvent = {
  id: string;
  user_id: string;
  event_type: string;
  outcome: string;
  ip_address: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  device_name: string | null;
  device_type: string | null;
  operating_system: string | null;
  browser: string | null;
  request_id: string | null;
  occurred_at: string;
  platform_projects?: { project_key?: string; project_name?: string; brand_name?: string } | null;
  platform_clients?: { client_key?: string; client_name?: string; client_type?: string } | null;
};

export default async function ConnectedApplicationsPage() {
  await requireAdminPermission("auth.read");
  const result = await centralApiGet<{ events: AccessEvent[] }>("/v1/admin/project-access");
  const events = result.ok ? result.data.events : [];
  return <div className="content">
    <div className="section-head"><div><p className="eyebrow">Identity / cross-project access</p><h2>Connected applications</h2><p className="muted">See which websites and admin clients use Central BINZEO accounts, with time, IP, location and device details.</p></div><span className="badge warn">Sensitive activity</span></div>
    {!result.ok && <p className="error">Could not load connected application activity: {result.error}</p>}
    <p className="protected-note"><strong>Credential boundary:</strong> passwords, access tokens, refresh tokens, OTP values and provider secrets are never stored or displayed. This is an audit trail only.</p>
    <div className="table-wrap"><table className="table"><thead><tr><th>Application</th><th>Client</th><th>User ID</th><th>Event</th><th>Result</th><th>IP / location</th><th>Device</th><th>Time</th></tr></thead><tbody>{events.map((event) => { const project = Array.isArray(event.platform_projects) ? event.platform_projects[0] : event.platform_projects; const client = Array.isArray(event.platform_clients) ? event.platform_clients[0] : event.platform_clients; return <tr key={event.id}><td><strong>{project?.brand_name ?? project?.project_name ?? "—"}</strong><br /><span className="muted">{project?.project_key ?? "—"}</span></td><td>{client?.client_name ?? "—"}</td><td>{event.user_id}</td><td>{event.event_type.replace(/_/g, " ")}</td><td><span className={`badge ${event.outcome === "success" ? "good" : "warn"}`}>{event.outcome}</span></td><td>{event.ip_address ?? "—"}<br /><span className="muted">{[event.city, event.region, event.country].filter(Boolean).join(", ") || "Unknown"}</span></td><td>{[event.device_name, event.operating_system, event.browser].filter(Boolean).join(" · ") || "—"}</td><td>{new Date(event.occurred_at).toLocaleString()}</td></tr>; })}{!events.length && <tr><td colSpan={8} className="muted">No cross-project access events recorded yet. Events will appear when a registered project starts using Central Auth.</td></tr>}</tbody></table></div>
  </div>;
}
