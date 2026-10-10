import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { DATA_TABLES } from "@/lib/data-tables";

function Stat({ label, value, detail }: { label: string; value: number | string; detail: string }) {
  return <div className="card"><p className="eyebrow">{label}</p><div className="stat">{value}</div><p className="muted">{detail}</p></div>;
}

export default async function Dashboard() {
  await requireAdmin();
  const db = await createClient();
  const names = ["profiles", "user_login_history", "user_activity_logs", "admin_activity_logs"] as const;
  const counts = await Promise.all(names.map(async (table) => {
    const { count } = await db.from(table).select("id", { count: "exact", head: true });
    return count ?? 0;
  }));

  return (
    <div className="content">
      <section className="section-head">
        <div>
          <p className="eyebrow">Control room / overview</p>
          <h2>Good morning, BINZEO</h2>
          <p className="muted">A clear view of your users, activity and shared database.</p>
        </div>
        <span className="badge good">Protected workspace</span>
      </section>
      <div className="grid cards">
        <Stat label="Users" value={counts[0]} detail="Profiles in the directory" />
        <Stat label="Login events" value={counts[1]} detail="Recorded authentication events" />
        <Stat label="User activity" value={counts[2]} detail="Account activity records" />
        <Stat label="Admin audit" value={counts[3]} detail="Administrative actions" />
      </div>
      <section className="section-head" style={{ marginTop: 42 }}>
        <div><p className="eyebrow">Shared database</p><h2>Explore every table</h2><p className="muted">Open a section to inspect its complete records and fields.</p></div>
        <span className="badge">{DATA_TABLES.length} tables</span>
      </section>
      <div className="table-directory">
        {DATA_TABLES.map((item) => <Link className="table-card" href={`/dashboard/${item.slug}`} key={item.slug}>
          <div className="table-card-top"><span className="table-icon">{item.title.slice(0, 1)}</span><span className={`badge ${item.sensitive ? "warn" : "good"}`}>{item.sensitive ? "protected" : "available"}</span></div>
          <h3>{item.title}</h3><p className="muted">{item.description}</p><span className="table-card-link">Open section →</span>
        </Link>)}
      </div>
    </div>
  );
}
