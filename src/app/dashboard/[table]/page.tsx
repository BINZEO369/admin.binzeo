import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminDataClient, requireAdminPermission } from "@/lib/admin";
import { centralApiGet } from "@/lib/central-api";
import { getTableDefinition } from "@/lib/data-tables";
import DataTable from "@/components/DataTable";

type Row = Record<string, unknown>;
const PAGE_SIZE = 100;

type SearchParams = { page?: string };

export default async function DataTablePage({
  params,
  searchParams,
}: {
  params: Promise<{ table: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const context = await requireAdminPermission("database.read");
  const { table: slug } = await params;
  const definition = getTableDefinition(slug);
  if (!definition) notFound();

  const requestedPage = Number.parseInt((await searchParams).page ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  let rows: Row[] = [];
  let totalCount = 0;
  let errorMessage = "";
  if (process.env.CENTRAL_API_ENABLED === "true") {
    const result = await centralApiGet<{ rows: Row[]; total: number }>(`/v1/admin/data-tables/${encodeURIComponent(slug)}?page=${page}`);
    if (result.ok) { rows = result.data.rows; totalCount = result.data.total; }
    else errorMessage = result.error;
  } else {
    const db = await getAdminDataClient(context.access);
    const result = await db.from(definition.table).select(definition.columns.join(", "), { count: "exact" }).range(from, to);
    rows = (result.data ?? []) as unknown as Row[];
    totalCount = result.count ?? 0;
    errorMessage = result.error?.message ?? "";
  }
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="content">
      <p><Link className="muted" href="/dashboard">← Back to dashboard</Link></p>
      <div className="section-head">
        <div>
          <p className="eyebrow">Dashboard table</p>
          <h2>{definition.title}</h2>
          <p className="muted">{definition.description}</p>
        </div>
        <span className={`badge ${definition.sensitive ? "warn" : "good"}`}>
          {totalCount} total records
        </span>
      </div>
      {errorMessage && <p className="error">{errorMessage}</p>}
      <DataTable
        title={definition.title}
        description={`Showing records ${totalCount === 0 ? 0 : from + 1}–${Math.min(to + 1, totalCount)} of ${totalCount}. Search filters the loaded page.`}
        columns={definition.columns}
        rows={rows}
        sensitive={definition.sensitive}
        page={page}
        pageCount={pageCount}
        totalCount={totalCount}
      />
      {pageCount > 1 && (
        <nav className="section-head" aria-label="Table pagination" style={{ marginTop: 18 }}>
          <span className="muted">Page {page} of {pageCount}</span>
          <div className="explorer-tools">
            {page > 1 ? <Link className="button secondary" href={`/dashboard/${definition.slug}?page=${page - 1}`}>← Previous</Link> : <span />}
            {page < pageCount ? <Link className="button" href={`/dashboard/${definition.slug}?page=${page + 1}`}>Next →</Link> : <span />}
          </div>
        </nav>
      )}
    </div>
  );
}
