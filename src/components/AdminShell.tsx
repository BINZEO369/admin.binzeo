import Link from "next/link";
import { canReadPrivacyAnalytics, hasAdminPermission, requireAdmin } from "@/lib/admin";
import { DATA_TABLES } from "@/lib/data-tables";
import LogoutButton from "@/components/LogoutButton";

const coreLinks = [
  ["Overview", "/dashboard"],
  ["Active users", "/dashboard/users"],
  ["Suspended users", "/dashboard/suspended"],
  ["Deleted emails", "/dashboard/deleted-emails"],
  ["Marketing emails", "/dashboard/marketing"],
  ["Occasion email sender", "/dashboard/occasion-emails"],
  ["Email templates", "/dashboard/templates"],
  ["User birthdays", "/dashboard/birthdays"],
  ["Login history", "/dashboard/security"],
  ["Admin audit", "/dashboard/audit"],
];

export default async function AdminShell({ children }: { children: React.ReactNode }) {
  const ctx = await requireAdmin();
  const displayName = typeof ctx.profile?.display_name === "string" ? ctx.profile.display_name : ctx.user.email;
  const visibleCoreLinks = coreLinks.filter(([label]) => {
    if (label === "Active users" || label === "Suspended users") return hasAdminPermission(ctx.access, "users.read");
    if (label === "Deleted emails") return hasAdminPermission(ctx.access, "auth.read");
    if (label === "Admin audit") return hasAdminPermission(ctx.access, "audit.read");
    if (label === "Marketing emails" || label === "Occasion email sender" || label === "Email templates" || label === "User birthdays") return hasAdminPermission(ctx.access, "marketing.send");
    if (label === "Login history") return hasAdminPermission(ctx.access, "auth.read");
    return true;
  });
  const links = [
    ...visibleCoreLinks,
    ...(canReadPrivacyAnalytics(ctx.access) ? [["Privacy & analytics", "/dashboard/privacy-analytics"] as const] : []),
    ...(hasAdminPermission(ctx.access, "database.read") ? DATA_TABLES.map((item) => [item.title, `/dashboard/${item.slug}`] as const) : []),
    ...(hasAdminPermission(ctx.access, "auth.read") ? [["Authentication accounts", "/dashboard/auth-users"] as const] : []),
  ];
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><span className="brand-mark">B</span><span>BINZEO Admin</span></div>
        <Link href="/dashboard/settings" className="side-settings-link">Settings &amp; roles</Link>
        <nav className="nav" aria-label="Admin navigation">
          {links.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
        </nav>
        <div className="side-foot"><strong>{displayName}</strong><br />{ctx.access.roles.join(" · ")}<br />Shared database console</div>
      </aside>
      <main className="main">
        <header className="top"><h1>Administration console</h1><span className="badge">Shared database</span><LogoutButton /></header>
        {children}
      </main>
    </div>
  );
}
