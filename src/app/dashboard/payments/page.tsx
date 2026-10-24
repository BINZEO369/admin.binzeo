import Link from "next/link";
import { requireAdminPermission } from "@/lib/admin";
import { centralApiGet } from "@/lib/central-api";

const PAGE_SIZE = 50;
const PAYMENT_STATUSES = ["pending", "paid", "cancelled", "expired", "refunded"] as const;
type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
type SearchParams = { page?: string; site?: string; status?: string };
type PaymentRow = {
  payment_request_id: string;
  website_id: string;
  website_key: string;
  website_name: string;
  brand_name: string | null;
  user_id: string | null;
  binzeo_user_id: string | null;
  username: string | null;
  user_name: string | null;
  user_email: string | null;
  order_id: string;
  amount_minor: number;
  currency: string;
  status: PaymentStatus;
  created_at: string;
  paid_at: string | null;
};
type PaymentSite = { project_id: string; site_key: string; site_name: string; brand_name: string; status: string };
type PaymentHistory = {
  rows: PaymentRow[];
  sites: PaymentSite[];
  pagination: { page: number; page_size: number; total: number; total_pages: number };
};

function formatAmount(minor: number, currency: string) {
  try {
    const code = currency.toUpperCase();
    const digits = new Intl.NumberFormat("en-US", { style: "currency", currency: code }).resolvedOptions().maximumFractionDigits ?? 2;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: code }).format(minor / 10 ** digits);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC";
}

function pageHref(page: number, site: string, status: string) {
  const params = new URLSearchParams({ page: String(page), site, status });
  return `/dashboard/payments?${params.toString()}`;
}

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPermission("payments.read");
  const query = await searchParams;
  const parsedPage = Number.parseInt(query.page ?? "1", 10);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 && parsedPage <= 100_000 ? parsedPage : 1;
  const site = query.site && /^[a-z0-9][a-z0-9-]{0,79}$/.test(query.site) ? query.site : "all";
  const status = PAYMENT_STATUSES.includes(query.status as PaymentStatus) ? query.status as PaymentStatus : "all";
  const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE), site, status });

  let rows: PaymentRow[] = [];
  let sites: PaymentSite[] = [];
  let total = 0;
  let totalPages = 0;
  let errorMessage = "";
  const result = await centralApiGet<PaymentHistory>(`/v1/admin/payments?${params.toString()}`);
  if (result.ok) {
    rows = result.data.rows;
    sites = result.data.sites;
    total = result.data.pagination.total;
    totalPages = result.data.pagination.total_pages;
  } else {
    errorMessage = result.error;
  }

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="content">
      <p><Link className="muted" href="/dashboard">← Back to dashboard</Link></p>
      <div className="section-head">
        <div>
          <p className="eyebrow">Finance / shared payment records</p>
          <h2>Central payments</h2>
          <p className="muted">Verified payment records across BINZEO websites, joined with Central Auth accounts and website orders.</p>
        </div>
        <span className="badge good">{total.toLocaleString()} records</span>
      </div>

      <form method="get" className="card" style={{ display: "flex", alignItems: "end", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <label className="form-grid" style={{ gap: 6, minWidth: 220 }}>
          <span className="muted" style={{ fontSize: 12, fontWeight: 700 }}>Website</span>
          <select className="input" name="site" defaultValue={site}>
            <option value="all">All websites</option>
            {sites.map((item) => <option value={item.site_key} key={item.project_id}>{item.site_name} · {item.site_key}</option>)}
          </select>
        </label>
        <label className="form-grid" style={{ gap: 6, minWidth: 180 }}>
          <span className="muted" style={{ fontSize: 12, fontWeight: 700 }}>Payment status</span>
          <select className="input" name="status" defaultValue={status}>
            <option value="all">All statuses</option>
            {PAYMENT_STATUSES.map((item) => <option value={item} key={item}>{item.charAt(0).toUpperCase() + item.slice(1)}</option>)}
          </select>
        </label>
        <button className="btn" type="submit">Apply filters</button>
      </form>

      {errorMessage && <p className="error" role="alert">{errorMessage}</p>}
      <p className="muted" style={{ fontSize: 12, margin: "0 0 10px" }}>
        Showing {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}. Charged amount and currency come from the central payment record; no card data is shown.
      </p>
      <div className="table-wrap">
        <table className="table" style={{ minWidth: 1250 }}>
          <thead><tr><th>Website</th><th>Central Auth user</th><th>Order ID</th><th>Amount charged</th><th>Status</th><th>Created</th><th>Paid at (UTC)</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.payment_request_id}>
                <td style={{ whiteSpace: "normal", minWidth: 150 }}>
                  <strong>{row.website_name}</strong><br />
                  <span className="muted" style={{ fontSize: 11 }}>{row.website_key} · {row.brand_name ?? ""}</span><br />
                  <code style={{ fontSize: 10 }}>{row.website_id}</code>
                </td>
                <td style={{ whiteSpace: "normal", minWidth: 230 }}>
                  <strong>{row.user_name ?? row.username ?? "Account name unavailable"}</strong><br />
                  <span style={{ fontSize: 12 }}>{row.user_email ?? "Email unavailable"}</span><br />
                  <span className="muted" style={{ fontSize: 10, overflowWrap: "anywhere" }}>User ID: {row.user_id ?? "account removed"}</span>
                  {row.binzeo_user_id && <><br /><span className="muted" style={{ fontSize: 10, overflowWrap: "anywhere" }}>BINZEO ID: {row.binzeo_user_id}</span></>}
                </td>
                <td style={{ whiteSpace: "normal", minWidth: 180 }}>
                  <strong style={{ overflowWrap: "anywhere" }}>{row.order_id}</strong><br />
                  <span className="muted" style={{ fontSize: 10, overflowWrap: "anywhere" }}>Payment ID: {row.payment_request_id}</span>
                </td>
                <td style={{ whiteSpace: "nowrap", fontWeight: 800 }}>{formatAmount(row.amount_minor, row.currency)}</td>
                <td><span className={`badge ${row.status === "paid" ? "good" : row.status === "pending" ? "warn" : ""}`}>{row.status}</span></td>
                <td style={{ whiteSpace: "nowrap" }}>{formatDate(row.created_at)}</td>
                <td style={{ whiteSpace: "nowrap" }}>{formatDate(row.paid_at)}</td>
              </tr>
            ))}
            {!errorMessage && rows.length === 0 && <tr><td colSpan={7} className="muted" style={{ padding: 28, textAlign: "center" }}>No payment records match the selected filters.</td></tr>}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && <nav className="section-head" aria-label="Payment history pagination" style={{ marginTop: 18 }}>
        <span className="muted">Page {page} of {totalPages}</span>
        <div className="explorer-tools">
          {page > 1 ? <Link className="button secondary" href={pageHref(page - 1, site, status)}>← Previous</Link> : <span />}
          {page < totalPages ? <Link className="button" href={pageHref(page + 1, site, status)}>Next →</Link> : <span />}
        </div>
      </nav>}
    </div>
  );
}
