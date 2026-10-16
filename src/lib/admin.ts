import "server-only";
import { notFound, redirect } from "next/navigation";
import { centralApiGet } from "@/lib/central-api";

export type AdminContext = {
  user: { id: string; email?: string };
  profile: Record<string, unknown> | null;
  access: { roles: string[]; permissions: string[]; is_active: boolean };
};

export async function requireAdmin(): Promise<AdminContext> {
  const result = await centralApiGet<AdminContext>("/v1/admin/me");
  if (!result.ok) throw new Error(`Central admin verification failed: ${result.error}`);
  if (!result.data.access?.is_active) redirect("/login?error=not_admin");
  return result.data;
}

export function isSuperAdmin(access: { roles?: unknown } | null | undefined): boolean {
  return Array.isArray(access?.roles) && access.roles.includes("super_admin");
}

export function canReadPrivacyAnalytics(access: { roles: string[] } | null | undefined): boolean {
  return isSuperAdmin(access) || Boolean(access?.roles.includes("analytics"));
}

export async function requirePrivacyAnalyticsAdmin(): Promise<AdminContext> {
  const context = await requireAdmin();
  if (!canReadPrivacyAnalytics(context.access)) notFound();
  return context;
}

export function hasAdminPermission(access: { roles: string[]; permissions: string[] }, permission: string): boolean {
  return isSuperAdmin(access) || access.permissions.includes(permission);
}

export async function requireAdminPermission(permission: string): Promise<AdminContext> {
  const context = await requireAdmin();
  if (!hasAdminPermission(context.access, permission)) notFound();
  return context;
}
