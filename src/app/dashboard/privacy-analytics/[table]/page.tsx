import Link from "next/link";
import { notFound } from "next/navigation";
import DataTable from "@/components/DataTable";
import { getAdminDataClient, requirePrivacyAnalyticsAdmin } from "@/lib/admin";
import { getPrivacyAnalyticsColumns } from "@/lib/privacy-analytics-columns";
import { getPrivacyAnalyticsTable } from "@/lib/privacy-analytics-tables";

const PAGE_SIZE = 50;

type SearchParams = { page?: string };

export default async function PrivacyAnalyticsTablePage({
  params,
  searchParams,
}: {
  params: Promise<{ table: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const context = await requirePrivacyAnalyticsAdmin();
  const { table: tableName } = await params;
  const definition = getPrivacyAnalyticsTable(tableName);
  if (!definition) notFound();

  const requestedPage = Number.parseInt((await searchParams).page ?? "1", 10);
  const maxPage = Math.floor(1_000_000 / PAGE_SIZE) + 1;
  const page = Number.isFinite(requestedPage) && requestedPage > 0
    ? Math.min(requestedPage, maxPage)
    : 1;
  const offset = (page - 1) * PAGE_SIZE;

  let columns = getPrivacyAnalyticsColumns(tableName);
  let rows: Record<string, unknown>[] = [];
  let total: number | null = null;
  let hasMore = false;
  let errorMessage: string | null = null;

  try {
    const db = await getAdminDataClient(context.access);
    const result = await db
      .from(tableName)
      .select("*", { count: "exact" })
      .range(offset, offset + PAGE_SIZE - 1);
    if (result.error) {
      errorMessage = result.error.message;
    } else {
      rows = (result.data ?? []) as Record<string, unknown>[];
      total = typeof result.count === "number" ? result.count : null;
      hasMore = total === null ? rows.length === PAGE_SIZE : offset + rows.length < total;
      if (columns.length === 0 && rows.length > 0) columns = Object.keys(rows[0]);
    }
  } catch {
    errorMessage = "This analytics table could not be loaded. Check the shared database permissions and retry.";
  }

  const pageCount = total === null ? undefined : Math.max(1, Math.ceil(total / PAGE_SIZE));
  const tablePath = `/dashboard/privacy-analytics/${definition.name}`;

  return (
    <div className="content">
      <div className="privacy-breadcrumb"><Link className="muted" href="/dashboard/privacy-analytics">← Privacy &amp; analytics</Link><span>/</span><span>{definition.title}</span></div>
      <section className="privacy-table-hero">
        <div className="privacy-table-icon" aria-hidden="true">{definition.title.slice(0, 1)}</div>
        <div className="privacy-table-heading">
          <p className="eyebrow">Restricted table · shared Supabase</p>
          <h2>{definition.title}</h2>
          <p className="muted">{definition.description}</p>
          <p className="privacy-table-code">public.{definition.name}</p>
        </div>
        <div className="privacy-table-metrics">
          <span className="badge warn">Read only</span>
          <div><strong>{total === null ? "—" : total.toLocaleString()}</strong><small>records</small></div>
          <div><strong>{columns.length}</strong><small>columns</small></div>
        </div>
      </section>

      <div className="protected-note privacy-note privacy-note-compact">
        <span className="privacy-note-icon" aria-hidden="true">!</span>
        <span><strong>Protected view</strong> Sensitive values remain governed by Supabase RLS. Location fields are approximate or consent-scoped where applicable.</span>
      </div>
      {errorMessage ? (
        <p className="error privacy-error" role="alert">{errorMessage}</p>
      ) : columns.length === 0 ? (
        <p className="error privacy-error" role="alert">The table schema could not be loaded. Please retry or contact a Super Admin.</p>
      ) : (
        <>
          <DataTable
            title={definition.name}
            description={`Showing up to ${PAGE_SIZE} records on page ${page}. Search filters this page only.`}
            columns={columns}
            rows={rows}
            sensitive
            page={page}
            pageCount={pageCount}
            totalCount={total ?? undefined}
          />
          {rows.length === 0 && (
            <p className="muted" style={{ marginTop: 12 }}>No records are currently stored in this table. Its full column set is shown above.</p>
          )}
          {(page > 1 || hasMore) && (
            <nav className="section-head privacy-analytics-pagination" aria-label="Analytics table pagination">
              <span className="muted">Page {page}{pageCount ? ` of about ${pageCount}` : ""}</span>
              <div className="explorer-tools">
                {page > 1 ? <Link className="button secondary" href={`${tablePath}?page=${page - 1}`}>← Previous</Link> : <span />}
                {hasMore ? <Link className="button" href={`${tablePath}?page=${page + 1}`}>Next →</Link> : <span />}
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
