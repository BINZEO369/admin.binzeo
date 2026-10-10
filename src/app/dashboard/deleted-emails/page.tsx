import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

type DeletedEmail = { id: string; original_user_id: string; email: string; binzeo_user_id: string | null; display_name: string | null; deleted_at: string; deleted_by: string | null; deletion_reason: string | null };

export default async function DeletedEmailsPage() {
  const ctx = await requireAdmin();
  if (!ctx.access.roles.includes("super_admin") && !ctx.access.permissions.includes("audit.read")) return <div className="content"><p className="error">You do not have permission to view deleted email archives.</p></div>;
  const admin = createAdminClient();
  const { data: rawData, error } = await admin.from("deleted_user_emails").select("id,original_user_id,email,binzeo_user_id,display_name,deleted_at,deleted_by,deletion_reason").order("deleted_at", { ascending: false }).limit(500);
  const data = (rawData ?? []) as unknown as DeletedEmail[];
  return <div className="content"><div className="section-head"><div><p className="eyebrow">Compliance / archive</p><h2>Deleted account emails</h2><p className="muted">Retained email records for accounts permanently removed from Supabase Auth and the user database.</p></div><span className="badge warn">{data.length} archived</span></div><p className="protected-note" style={{ marginBottom: 18 }}><strong>Archive policy:</strong> account data is deleted; only this limited identity record is retained to identify previously removed accounts.</p>{error ? <p className="error">{error.message}</p> : <div className="table-wrap"><table className="table"><thead><tr><th>Email</th><th>Name</th><th>BINZEO ID</th><th>Deleted at</th><th>Deleted by</th><th>Reason</th><th>Archive ID</th></tr></thead><tbody>{data.map((row) => <tr key={row.id}><td><strong>{row.email}</strong></td><td>{row.display_name ?? "—"}</td><td>{row.binzeo_user_id ?? "—"}</td><td>{new Date(row.deleted_at).toLocaleString()}</td><td>{row.deleted_by ?? "—"}</td><td>{row.deletion_reason ?? "—"}</td><td>{row.id}</td></tr>)}{!data.length && <tr><td colSpan={7} className="muted">No deleted accounts archived yet.</td></tr>}</tbody></table></div>}</div>;
}
