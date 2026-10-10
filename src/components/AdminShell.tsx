import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import LogoutButton from "@/components/LogoutButton";

export default async function AdminShell({ children }: { children: React.ReactNode }) {
  const ctx = await requireAdmin();
  const displayName = typeof ctx.profile?.display_name === "string" ? ctx.profile.display_name : ctx.user.email;
  return <div className="shell"><aside className="side"><div className="brand"><span className="brand-mark">B</span>BINZEO Admin</div><nav className="nav"><Link href="/dashboard">Overview</Link><Link href="/dashboard/users">Users</Link><Link href="/dashboard/security">Security</Link><Link href="/dashboard/audit">Audit log</Link><Link href="/dashboard/settings">Settings</Link></nav><div className="side-foot">{displayName}<br />{ctx.access.roles.join(" · ")}</div></aside><main className="main"><header className="top"><h1>Administration console</h1><LogoutButton /></header>{children}</main></div>;
}
