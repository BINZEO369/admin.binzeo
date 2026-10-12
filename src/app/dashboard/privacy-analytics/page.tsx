import Link from "next/link";
import { requirePrivacyAnalyticsAdmin } from "@/lib/admin";
import { PRIVACY_ANALYTICS_GROUPS, PRIVACY_ANALYTICS_TABLES } from "@/lib/privacy-analytics-tables";

export default async function PrivacyAnalyticsPage() {
  await requirePrivacyAnalyticsAdmin();

  return (
    <div className="content">
      <div className="section-head">
        <div>
          <p className="eyebrow">Restricted data · Analytics and Super Admin</p>
          <h2>Privacy &amp; analytics</h2>
          <p className="muted">Open a table to inspect its own records and every allowlisted column.</p>
        </div>
        <span className="badge warn">{PRIVACY_ANALYTICS_TABLES.length} protected tables · read only</span>
      </div>

      <p className="protected-note" style={{ marginBottom: 24 }}>
        Visitor events are recorded only when the visitor enables Analytics. Configuration, scan, request, retention and audit tables are populated by their respective workflows, not by every page visit. An empty table still shows its full column list.
      </p>

      <div className="privacy-analytics-groups">
        {PRIVACY_ANALYTICS_GROUPS.map((group) => {
          const headingId = `group-${group.title.replaceAll(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
          return <section key={group.title} aria-labelledby={headingId}>
            <div className="section-head privacy-analytics-group-head">
              <div>
                <p className="eyebrow">{group.tables.length} tables</p>
                <h3 id={headingId}>{group.title}</h3>
                <p className="muted">{group.description}</p>
              </div>
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
