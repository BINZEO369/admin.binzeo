import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import AdminAssignment from "@/components/AdminAssignment";

export default async function SettingsPage() {
  const ctx = await requireAdmin();
  const db = await createClient();
  const [{ data: sectors }, { data: countries }] = await Promise.all([
    db.from("sectors").select("sector_code,sector_name,is_active,created_at").order("sector_name").limit(100),
    db.from("countries").select("country_code,country_name,phone_code,is_active").order("country_name").limit(250),
  ]);
  const isSuperAdmin = ctx.access.roles.includes("super_admin");
  const name = typeof ctx.profile?.display_name === "string" ? ctx.profile.display_name : "Unnamed admin";
  return <div className="content">
    <div className="section-head"><div><p className="eyebrow">Configuration / account</p><h2>Admin settings</h2><p className="muted">Your administrator identity and workspace controls.</p></div><span className={`badge ${isSuperAdmin ? "warn" : "good"}`}>{isSuperAdmin ? "Super admin" : "Administrator"}</span></div>
    <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
      <div className="card"><p className="eyebrow">Your account</p><h3 style={{ margin: "8px 0 18px", fontSize: 21 }}>{name}</h3><p><strong>Email</strong><br /><span className="muted">{ctx.user.email ?? "—"}</span></p><p><strong>BINZEO ID</strong><br /><span className="muted">{typeof ctx.profile?.binzeo_user_id === "string" ? ctx.profile.binzeo_user_id : "—"}</span></p><p><strong>Account status</strong><br /><span className={`badge ${ctx.profile?.account_status === "active" ? "good" : "warn"}`}>{String(ctx.profile?.account_status ?? "unknown")}</span></p></div>
      <div className="card"><p className="eyebrow">Access level</p><p><strong>Role</strong><br /><span className="muted">{ctx.access.roles.join(", ") || "—"}</span></p><p><strong>Permissions</strong><br /><span className="muted">{ctx.access.permissions.join(", ") || "No explicit permissions"}</span></p><p><strong>Admin access</strong><br /><span className="badge good">active</span></p></div>
    </div>
    {isSuperAdmin && <AdminAssignment />}
    <div className="section-head" style={{ marginTop: 42 }}><div><p className="eyebrow">Reference data</p><h2>Workspace references</h2><p className="muted">Operational reference data is read-only from this console.</p></div></div>
    <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}><div className="card"><p className="eyebrow">Sectors</p>{(sectors ?? []).map((sector) => <p key={sector.sector_code}><strong>{sector.sector_name}</strong> <span className={`badge ${sector.is_active ? "good" : "warn"}`}>{sector.is_active ? "active" : "off"}</span></p>)}</div><div className="card"><p className="eyebrow">Countries</p>{(countries ?? []).slice(0, 30).map((country) => <p key={country.country_code}><strong>{country.country_code}</strong> {country.country_name} <span className={`badge ${country.is_active ? "good" : "warn"}`}>{country.is_active ? "active" : "off"}</span></p>)}</div></div>
  </div>;
}
