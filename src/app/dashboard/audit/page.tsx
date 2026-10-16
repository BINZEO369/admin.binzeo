import { requireAdminPermission } from "@/lib/admin";
import { centralApiGet } from "@/lib/central-api";

type AuditLog = { id: string; admin_user_id: string; action_type: string; target_type: string | null; target_id: string | null; description: string | null; ip_address: string | null; created_at: string };

export default async function AuditPage() {
  await requireAdminPermission("audit.read");
  let logs: AuditLog[] = [];
  let errorMessage = "";
  const result = await centralApiGet<{ logs: AuditLog[] }>("/v1/admin/audit");
  if (result.ok) logs = result.data.logs;
  else errorMessage = result.error;
  return <div className="content"><div className="section-head"><div><p className="eyebrow">Traceability</p><h2>Admin audit log</h2><p className="muted">A chronological record of privileged actions.</p></div></div>{errorMessage && <p className="error">{errorMessage}</p>}<div className="table-wrap"><table className="table"><thead><tr><th>Action</th><th>Target</th><th>Description</th><th>Admin</th><th>Time</th></tr></thead><tbody>{logs.map((event) => <tr key={event.id}><td><span className="badge">{event.action_type}</span></td><td>{event.target_type || "—"} {event.target_id || ""}</td><td>{event.description || "—"}</td><td>{event.admin_user_id}</td><td>{new Date(event.created_at).toLocaleString()}</td></tr>)}</tbody></table></div></div>;
}
