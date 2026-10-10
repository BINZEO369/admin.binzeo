import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import LogoutButton from "@/components/LogoutButton";

const links = [
  ["Overview", "/dashboard"],
  ["Profiles", "/dashboard/profiles"],
  ["Contacts", "/dashboard/user-contacts"],
  ["Addresses", "/dashboard/user-addresses"],
  ["Sectors", "/dashboard/sectors"],
  ["Sector access", "/dashboard/user-sector-access"],
  ["Devices", "/dashboard/user-devices"],
  ["Login history", "/dashboard/user-login-history"],
  ["Activity logs", "/dashboard/user-activity-logs"],
  ["Auth methods", "/dashboard/user-auth-methods"],
  ["Verification", "/dashboard/user-verification-records"],
  ["Passkeys", "/dashboard/user-passkeys"],
  ["ID history", "/dashboard/profile-id-history"],
  ["Admin access", "/dashboard/admin-access"],
  ["Admin audit", "/dashboard/admin-activity-logs"],
  ["Security view", "/dashboard/security"],
  ["Settings", "/dashboard/settings"],
];

export default async function AdminShell({ children }: { children: React.ReactNode }) {
  const ctx = await requireAdmin();
  const displayName = typeof ctx.profile?.display_name === "string" ? ctx.profile.display_name : ctx.user.email;
  return <div className="shell"><aside className="side"><div className="brand"><span className="brand-mark">B</span>BINZEO Admin</div><nav className="nav">{links.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}</nav><div className="side-foot">{displayName}<br />{ctx.access.roles.join(" · ")}</div></aside><main className="main"><header className="top"><h1>Administration console</h1><LogoutButton /></header>{children}</main></div>;
}
