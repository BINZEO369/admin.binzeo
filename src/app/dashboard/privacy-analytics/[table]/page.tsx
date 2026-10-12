import Link from "next/link";
import { notFound } from "next/navigation";
import DataTable from "@/components/DataTable";
import { requirePrivacyAnalyticsAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { getPrivacyAnalyticsTable } from "@/lib/privacy-analytics-tables";

const AUTH_APP_URL = (process.env.AUTH_APP_URL ?? "https://auth-binzeo.vercel.app").replace(/\/+$/, "");
const PAGE_SIZE = 50;

type ApiData = {
  table?: string;
  columns?: string[];
  rows?: Record<string, unknown>[];
  total?: number | null;
  count_accuracy?: string;
  has_more?: boolean;
};

type ApiEnvelope = {
  success?: boolean;
  data?: ApiData;
  error?: { message?: string };
};

type SearchParams = { page?: string };

export default async function PrivacyAnalyticsTablePage({
  params,
  searchParams,
}: {
  params: Promise<{ table: string }>;
  searchParams: Promise<SearchParams>;
}) {
  await requirePrivacyAnalyticsAdmin();
  const { table: tableName } = await params;
  const definition = getPrivacyAnalyticsTable(tableName);
  if (!definition) notFound();

  const requestedPage = Number.parseInt((await searchParams).page ?? "1", 10);
  const maxPage = Math.floor(1_000_000 / PAGE_SIZE) + 1;
  const page = Number.isFinite(requestedPage) && requestedPage > 0
    ? Math.min(requestedPage, maxPage)
    : 1;
  const offset = (page - 1) * PAGE_SIZE;

  let columns: string[] = [];
  let rows: Record<string, unknown>[] = [];
  let total: number | null = null;
  let hasMore = false;
  let errorMessage: string | null = null;

  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      errorMessage = "Your admin session could not be verified. Sign in again and retry.";
    } else {
      const url = new URL(`${AUTH_APP_URL}/api/admin/tracking/${encodeURIComponent(tableName)}`);
      url.searchParams.set("limit", String(PAGE_SIZE));
      url.searchParams.set("offset", String(offset));
      url.searchParams.set("sort_order", "desc");
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const body = await response.json().catch(() => null) as ApiEnvelope | null;
      if (!response.ok || !body?.success || !body.data) {
        errorMessage = body?.error?.message ?? "This table could not be loaded. Check the Analytics role and retry.";
      } else {
        columns = Array.isArray(body.data.columns) ? body.data.columns.filter((column): column is string => typeof column === "string") : [];
        rows = Array.isArray(body.data.rows) ? body.data.rows : [];
        total = typeof body.data.total === "number" ? body.data.total : null;
        hasMore = body.data.has_more === true;
      }
    }
  } catch {
    errorMessage = "The tracking-data service is unavailable right now. Please retry shortly.";
  }

  const pageCount = total === null ? undefined : Math.max(1, Math.ceil(total / PAGE_SIZE));
  const tablePath = `/dashboard/privacy-analytics/${definition.name}`;

  return (
    <div className="content">
      <p><Link className="muted" href="/dashboard/privacy-analytics">← All privacy &amp; analytics tables</Link></p>
      <div className="section-head">
        <div>
          <p className="eyebrow">Privacy &amp; analytics · {definition.name}</p>
          <h2>{definition.title}</h2>
          <p className="muted">{definition.description}</p>
        </div>
        <span className="badge warn">Read only · {total === null ? "count unavailable" : `about ${total.toLocaleString()} records`}</span>
      </div>

      <p className="protected-note" style={{ marginBottom: 18 }}>
        This view contains restricted privacy/analytics records. Location, when present, is IP-derived and approximate. Only rows currently stored in this table are shown.
      </p>
      {errorMessage ? (
        <p className="error" role="alert">{errorMessage}</p>
      ) : columns.length === 0 ? (
        <p className="error" role="alert">The table schema could not be loaded. Please retry or contact a Super Admin.</p>
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
