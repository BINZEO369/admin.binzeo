import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { DATA_TABLES } from "@/lib/data-tables";

type Count = { rows: number; available: boolean };

export default async function DataExplorerPage() {
  await requireAdmin();
  const db = await createClient();
  const counts = await Promise.all(DATA_TABLES.map(async item => {
    if (item.sensitive) return [item.slug, { rows: 0, available: false } satisfies Count] as const;
    const { count, error } = await db.from(item.table).select("*", { count: "exact", head: true });
    return [item.slug, { rows: count ?? 0, available: !error } satisfies Count] as const;
  }));
  const countMap = new Map(counts);
  return <div className="content"><div className="section-head"><div><p className="eyebrow">Database control room</p><h2>Data explorer</h2><p className="muted">Choose a table to open its dedicated page. Each page includes safe fields, row counts and a table-specific filter.</p></div><span className="badge good">{DATA_TABLES.length} table pages</span></div><div className="explorer-summary"><div className="card"><strong>One table, one page</strong><p className="muted">The overview stays lightweight; operational data opens only when you choose a table.</p></div><div className="card"><strong>Safe by default</strong><p className="muted">Passwords, tokens, OTP hashes, challenge hashes and private passkey material are never rendered.</p></div></div><div className="table-directory">{DATA_TABLES.map(item => { const count = countMap.get(item.slug); return <Link className="table-card" href={`/dashboard/data/${item.slug}`} key={item.slug}><div className="table-card-top"><span className="table-icon">{item.title.slice(0, 1)}</span><span className={`badge ${item.sensitive ? "warn" : "good"}`}>{item.sensitive ? "protected" : `${count?.rows ?? 0} rows`}</span></div><h3>{item.title}</h3><p className="muted">{item.description}</p><span className="table-card-link">Open table →</span></Link>; })}</div></div>;
}
