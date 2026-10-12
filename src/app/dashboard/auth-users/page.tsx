import Link from "next/link";
import { requireAdminPermission } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

const PAGE_SIZE = 100;

type SearchParams = { page?: string; q?: string };

export default async function AuthUsersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPermission("auth.read");
  const params = await searchParams;
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const query = (params.q ?? "").trim().toLowerCase();
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
  const users = (data?.users ?? []).filter((user) => {
    if (!query) return true;
    return `${user.email ?? ""} ${user.phone ?? ""} ${user.id}`.toLowerCase().includes(query);
  });
  const hasNextPage = (data?.users?.length ?? 0) === PAGE_SIZE;

  return <div className="content">
    <div className="section-head"><div><p className="eyebrow">Identity / privileged view</p><h2>Authentication accounts</h2><p className="muted">Supabase Auth identity and sign-in metadata for all accounts.</p></div><span className="badge warn">Super Admin only</span></div>
    <p className="protected-note"><strong>Credential boundary:</strong> passwords, password hashes, session/refresh tokens, OTP values, OAuth secrets and private authentication keys are never displayed here. This directory shows account identity and security metadata only.</p>
    <form className="explorer-tools" method="get" style={{ margin: "14px 0" }}><input className="input explorer-search" name="q" defaultValue={params.q ?? ""} placeholder="Filter this page by email, phone or user ID" /><input type="hidden" name="page" value={String(page)} /><button className="btn light" type="submit">Filter page</button></form>
    {error ? <p className="error">Could not load authentication accounts: {error.message}</p> : <>
      <div className="table-wrap"><table className="table explorer-table"><thead><tr><th>User ID</th><th>Email</th><th>Phone</th><th>Email verified</th><th>Phone verified</th><th>Provider</th><th>Created</th><th>Last sign-in</th><th>Ban until</th></tr></thead><tbody>
        {users.map((user) => {
          const provider = typeof user.app_metadata?.provider === "string" ? user.app_metadata.provider : Array.isArray(user.app_metadata?.providers) ? user.app_metadata.providers.join(", ") : "—";
          return <tr key={user.id}><td>{user.id}</td><td>{user.email ?? "—"}</td><td>{user.phone ?? "—"}</td><td>{user.email_confirmed_at ? "Yes" : "No"}</td><td>{user.phone_confirmed_at ? "Yes" : "No"}</td><td>{provider}</td><td>{user.created_at ? new Date(user.created_at).toLocaleString() : "—"}</td><td>{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "—"}</td><td>{user.banned_until ? new Date(user.banned_until).toLocaleString() : "—"}</td></tr>;
        })}
        {!users.length && <tr><td colSpan={9} className="muted">No matching accounts on this page.</td></tr>}
      </tbody></table></div>
      <nav className="section-head" aria-label="Authentication accounts pagination" style={{ marginTop: 18 }}><span className="muted">Page {page} · {data?.users?.length ?? 0} accounts loaded</span><div className="explorer-tools">{page > 1 ? <Link className="button secondary" href={`/dashboard/auth-users?page=${page - 1}&q=${encodeURIComponent(params.q ?? "")}`}>← Previous</Link> : <span />}{hasNextPage ? <Link className="button" href={`/dashboard/auth-users?page=${page + 1}&q=${encodeURIComponent(params.q ?? "")}`}>Next →</Link> : <span />}</div></nav>
    </>}
    <p className="muted" style={{ marginTop: 12 }}>Login events, IP/device history and lockout metadata are available in the Login history and Security sections. Viewing this directory does not expose credential secrets or session contents.</p>
  </div>;
}
