import { getAdminDataClient, requireAdmin } from "@/lib/admin";
import { centralApiGet } from "@/lib/central-api";
import AdminAssignment from "@/components/AdminAssignment";
import AdminProfileEditor from "@/components/AdminProfileEditor";

type Sector = { sector_code: string; sector_name: string; is_active: boolean; created_at: string };
type Country = { country_code: string; country_name: string; phone_code: string | null; is_active: boolean };

export default async function SettingsPage() {
  const context = await requireAdmin();
  let sectors: Sector[] = [];
  let countries: Country[] = [];
  if (process.env.CENTRAL_API_ENABLED === "true") {
    const result = await centralApiGet<{ sectors: Sector[]; countries: Country[] }>("/v1/admin/settings/references");
    if (result.ok) ({ sectors, countries } = result.data);
  } else {
    const db = await getAdminDataClient(context.access);
    const [{ data: sectorRows }, { data: countryRows }] = await Promise.all([
      db.from("sectors").select("sector_code,sector_name,is_active,created_at").order("sector_name").limit(100),
      db.from("countries").select("country_code,country_name,phone_code,is_active").order("country_name").limit(250),
    ]);
    sectors = (sectorRows ?? []) as Sector[];
    countries = (countryRows ?? []) as Country[];
  }
  const isSuperAdmin = context.access.roles.includes("super_admin");
  const displayName = typeof context.profile?.display_name === "string" ? context.profile.display_name : "";
  const username = typeof context.profile?.username === "string" ? context.profile.username : "";

  return <div className="content">
    <div className="section-head settings-page-heading"><div><p className="eyebrow">Configuration / account</p><h2>Admin settings</h2><p className="muted">Edit your admin profile and manage role-based workspace access.</p></div><span className={`badge ${isSuperAdmin ? "warn" : "good"}`}>{isSuperAdmin ? "Super Admin" : "Administrator"}</span></div>
    <div className="admin-settings-grid"><section className="card"><p className="eyebrow">Your profile</p><p><strong>Email</strong><br /><span className="muted">{context.user.email ?? "—"}</span></p><p><strong>BINZEO ID</strong><br /><span className="muted">{typeof context.profile?.binzeo_user_id === "string" ? context.profile.binzeo_user_id : "—"}</span></p><p><strong>Account status</strong><br /><span className={`badge ${context.profile?.account_status === "active" ? "good" : "warn"}`}>{String(context.profile?.account_status ?? "unknown")}</span></p><AdminProfileEditor initialDisplayName={displayName} initialUsername={username} /></section>
      <section className="card"><p className="eyebrow">Your access</p><p><strong>Role</strong><br /><span className="muted">{context.access.roles.join(", ") || "—"}</span></p><p><strong>Permissions</strong><br /><span className="muted settings-permissions">{isSuperAdmin ? "All dashboard sections and database tables (automatic)" : context.access.permissions.join(", ") || "No explicit permissions"}</span></p><p><strong>Admin access</strong><br /><span className="badge good">Active</span></p>{isSuperAdmin ? <p className="muted settings-role-hint">Use the role manager below to add other accounts with specific roles and section permissions.</p> : <p className="muted settings-role-hint">A Super Admin manages administrator roles and permissions.</p>}</section></div>
    {isSuperAdmin && <section id="admin-access" className="admin-access-section" aria-label="Administrator role management"><AdminAssignment /></section>}
    <div className="section-head settings-reference-heading"><div><p className="eyebrow">Reference data</p><h2>Workspace references</h2><p className="muted">Operational reference data is read-only from this console.</p></div></div>
    <div className="admin-settings-grid"><section className="card"><p className="eyebrow">Sectors</p>{sectors.map((sector) => <p key={sector.sector_code}><strong>{sector.sector_name}</strong> <span className={`badge ${sector.is_active ? "good" : "warn"}`}>{sector.is_active ? "active" : "off"}</span></p>)}</section><section className="card"><p className="eyebrow">Countries</p>{countries.slice(0, 30).map((country) => <p key={country.country_code}><strong>{country.country_code}</strong> {country.country_name} <span className={`badge ${country.is_active ? "good" : "warn"}`}>{country.is_active ? "active" : "off"}</span></p>)}</section></div>
  </div>;
}
