import Link from "next/link";
import { requirePrivacyAnalyticsAdmin } from "@/lib/admin";
import { PRIVACY_ANALYTICS_GROUPS, PRIVACY_ANALYTICS_TABLES } from "@/lib/privacy-analytics-tables";

export default async function PrivacyAnalyticsPage() {
  await requirePrivacyAnalyticsAdmin();

  return (
    <div className="content">
      <section className="privacy-hero">
        <div className="privacy-hero-copy">
          <p className="eyebrow">Governance workspace · Restricted access</p>
          <h2>Privacy &amp; analytics</h2>
          <p className="privacy-hero-lede">A calm, read-only view of consent, tracking, visitor activity and privacy operations across the shared BINZEO database.</p>
          <div className="privacy-hero-meta">
            <span className="badge good"><span className="status-dot" aria-hidden="true" />Live shared database</span>
            <span className="badge">Analytics role or Super Admin</span>
          </div>
        </div>
        <div className="privacy-hero-mark" aria-hidden="true">
          <span>PX</span>
          <small>CONTROL<br />ROOM</small>
        </div>
      </section>

      <div className="privacy-stat-strip" aria-label="Privacy analytics summary">
        <div><span>Protected tables</span><strong>{PRIVACY_ANALYTICS_TABLES.length}</strong><small>allowlisted views</small></div>
        <div><span>Collection areas</span><strong>{PRIVACY_ANALYTICS_GROUPS.length}</strong><small>operational domains</small></div>
        <div><span>Access mode</span><strong>RO</strong><small>read only by design</small></div>
        <div><span>Data source</span><strong>DB</strong><small>shared Supabase schema</small></div>
      </div>

      <div className="protected-note privacy-note">
        <span className="privacy-note-icon" aria-hidden="true">!</span>
        <span><strong>Privacy boundary</strong> Visitor events are recorded only when Analytics is enabled. Every view is read-only, scoped by the database RLS policy, and shows the full schema even when a table has no records.</span>
      </div>

      <div className="privacy-analytics-groups">
        {PRIVACY_ANALYTICS_GROUPS.map((group) => {
          const headingId = `group-${group.title.replaceAll(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
          return <section className="privacy-group" key={group.title} aria-labelledby={headingId}>
            <div className="privacy-analytics-group-head">
              <div>
                <div className="privacy-group-kicker"><span className="privacy-group-index">{String(PRIVACY_ANALYTICS_GROUPS.indexOf(group) + 1).padStart(2, "0")}</span><span>{group.tables.length} tables</span></div>
                <h3 id={headingId}>{group.title}</h3>
                <p className="muted">{group.description}</p>
              </div>
              <span className="privacy-group-rule" aria-hidden="true" />
            </div>
            <div className="table-directory">
              {group.tables.map((table) => (
                <Link key={table.name} href={`/dashboard/privacy-analytics/${table.name}`} className="table-card">
                  <div className="table-card-top">
                    <span className="table-icon" aria-hidden="true">{table.title.slice(0, 1)}</span>
                    <span className="badge">Read only</span>
                  </div>
                  <h3>{table.title}</h3>
                  <p className="privacy-table-name">{table.name}</p>
                  <p>{table.description}</p>
                  <span className="table-card-link">Open table →</span>
                </Link>
              ))}
            </div>
          </section>;
        })}
      </div>
    </div>
  );
}
