import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { DATA_TABLES } from "@/lib/data-tables";

function Stat({ label, value, detail }: { label: string; value: number | string; detail: string }) { return <div className="card"><p className="eyebrow">{label}</p><div className="stat">{value}</div><p className="muted">{detail}</p></div>; }

export default async function Dashboard() {
  await requireAdmin();
  const db = await createClient();
  const names = ["profiles", "user_login_history", "user_activity_logs", "admin_activity_logs"] as const;
  const counts = await Promise.all(names.map(async t => { const { count } = await db.from(t).select("id", { count: "exact", head: true }); return count ?? 0; }));
  return <div className="content"><div className="section-head"><div><p className="eyebrow">Control room</p><h2>Good morning, BINZEO</h2><p className="muted">Open any database table directly from the dashboard.</p></div><span className="badge good">Protected</span></div><div className="grid cards"><Stat label="Users" value={counts[0]} detail="Profiles in the directory" /><Stat label="Login events" value={counts[1]} detail="Recorded authentication events" /><Stat label="User activity" value={counts[2]} detail="Account activity records" /><Stat label="Admin audit" value={counts[3]} detail="Administrative actions" /></div><div className="section-head" style={{ marginTop: 34 }}><div><p className="eyebrow">Database pages</p><h2>Open a table</h2></div></div><div className="table-directory">{DATA_TABLES.map(item => <Link className="table-card" href={`/dashboard/${item.slug}`} key={item.slug}><div className="table-card-top"><span className="table-icon">{item.title.slice(0, 1)}</span><span className={`badge ${item.sensitive ? "warn" : "good"}`}>{item.sensitive ? "protected" : "open"}</span></div><h3>{item.title}</h3><p className="muted">{item.description}</p><span className="table-card-link">Open page →</span></Link>)}</div></div>;
}
