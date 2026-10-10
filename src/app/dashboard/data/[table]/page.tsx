import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { getTableDefinition } from "@/lib/data-tables";
import DataTable from "@/components/DataTable";

type Row = Record<string, unknown>;

export default async function DataTablePage({ params }: { params: Promise<{ table: string }> }) {
  await requireAdmin();
  const { table: slug } = await params;
  const definition = getTableDefinition(slug);
  if (!definition) notFound();
  let rows: Row[] = [];
  let errorMessage = "";
  if (!definition.sensitive) {
    const db = await createClient();
    const result = await db.from(definition.table).select(definition.columns.join(", ")).limit(200);
    rows = (result.data ?? []) as unknown as Row[];
    errorMessage = result.error?.message ?? "";
  }
  return <div className="content"><p><Link className="muted" href="/dashboard/data">← Back to all tables</Link></p><div className="section-head"><div><p className="eyebrow">Database table</p><h2>{definition.title}</h2><p className="muted">{definition.description}</p></div>{definition.sensitive ? <span className="badge warn">Protected</span> : <span className="badge good">{rows.length} loaded</span>}</div>{errorMessage && <p className="error">{errorMessage}</p>}{definition.sensitive ? <DataTable title={definition.title} description="This table contains private challenge material." columns={[]} rows={[]} sensitive /> : <DataTable title={definition.title} description="Search within the first 200 records returned for this table." columns={definition.columns} rows={rows} />}</div>;
}
