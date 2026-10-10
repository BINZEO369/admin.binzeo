import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import DataTable from "@/components/DataTable";

type Row = Record<string, unknown>;
async function readTable(db: Awaited<ReturnType<typeof createClient>>, table: string, columns: string) {
  const result = await db.from(table).select(columns).limit(200);
  return (result.data ?? []) as unknown as Row[];
}

export default async function DataExplorerPage() {
  await requireAdmin();
  const db = await createClient();
  const [profiles, contacts, addresses, sectors, sectorAccess, devices, loginHistory, activityLogs, authMethods, verification, passkeys, idHistory, adminAccess, adminLogs] = await Promise.all([
    readTable(db, "profiles", "id, binzeo_user_id, display_name, username, country_code, account_status, created_at"),
    readTable(db, "user_contacts", "id, user_id, contact_type, contact_value, label, is_primary, is_verified, created_at"),
    readTable(db, "user_addresses", "id, user_id, address_type, country_code, state_province, district, city, area, postal_code, is_primary, created_at"),
    readTable(db, "sectors", "id, sector_code, sector_name, description, is_active, created_at"),
    readTable(db, "user_sector_access", "user_id, sector_id, status, selected_at, updated_at"),
    readTable(db, "user_devices", "id, user_id, device_id, device_name, device_type, operating_system, browser, last_seen_at, is_trusted, created_at"),
    readTable(db, "user_login_history", "id, user_id, login_method, login_status, ip_address, device_id, country, city, login_at, logout_at"),
    readTable(db, "user_activity_logs", "id, user_id, activity_type, activity_description, ip_address, device_id, metadata, created_at"),
    readTable(db, "user_auth_methods", "id, user_id, provider, auth_method, provider_email, first_seen_at, last_sign_in_at, login_count, last_event, created_at"),
    readTable(db, "user_verification_records", "id, user_id, verification_type, verification_status, source_of_truth, verified_at, last_requested_at, expires_at, attempt_count, created_at"),
    readTable(db, "user_passkeys", "id, user_id, device_name, authenticator_type, transports, aaguid, is_discoverable, is_backed_up, last_used_at, expires_at, revoked_at, created_at"),
    readTable(db, "profile_id_history", "id, user_id, previous_binzeo_user_id, new_binzeo_user_id, change_reason, changed_at"),
    readTable(db, "admin_access", "id, user_id, roles, permissions, is_active, assigned_by, created_at, updated_at"),
    readTable(db, "admin_activity_logs", "id, admin_user_id, action_type, target_type, target_id, description, ip_address, metadata, created_at"),
  ]);
  const blocks = [
    ["Profiles", "Core user accounts and account status.", ["id", "binzeo_user_id", "display_name", "username", "country_code", "account_status", "created_at"], profiles],
    ["Contacts", "User contact channels and verification state.", ["id", "user_id", "contact_type", "contact_value", "label", "is_primary", "is_verified", "created_at"], contacts],
    ["Addresses", "User address and location records.", ["id", "user_id", "address_type", "country_code", "state_province", "district", "city", "area", "postal_code", "is_primary", "created_at"], addresses],
    ["Sectors", "Available business sectors.", ["id", "sector_code", "sector_name", "description", "is_active", "created_at"], sectors],
    ["User sector access", "The sector membership join table.", ["user_id", "sector_id", "status", "selected_at", "updated_at"], sectorAccess],
    ["Devices", "Registered devices and trust state.", ["id", "user_id", "device_id", "device_name", "device_type", "operating_system", "browser", "last_seen_at", "is_trusted", "created_at"], devices],
    ["Login history", "Authentication events and locations.", ["id", "user_id", "login_method", "login_status", "ip_address", "device_id", "country", "city", "login_at", "logout_at"], loginHistory],
    ["User activity logs", "User-level audit and activity records.", ["id", "user_id", "activity_type", "activity_description", "ip_address", "device_id", "metadata", "created_at"], activityLogs],
    ["Auth methods", "Safe provider and authentication summaries.", ["id", "user_id", "provider", "auth_method", "provider_email", "first_seen_at", "last_sign_in_at", "login_count", "last_event", "created_at"], authMethods],
    ["Verification records", "Verification status and timing metadata.", ["id", "user_id", "verification_type", "verification_status", "source_of_truth", "verified_at", "last_requested_at", "expires_at", "attempt_count", "created_at"], verification],
    ["Passkeys", "Safe WebAuthn credential metadata; keys are never shown.", ["id", "user_id", "device_name", "authenticator_type", "transports", "aaguid", "is_discoverable", "is_backed_up", "last_used_at", "expires_at", "revoked_at", "created_at"], passkeys],
    ["Profile ID history", "BINZEO ID transition audit history.", ["id", "user_id", "previous_binzeo_user_id", "new_binzeo_user_id", "change_reason", "changed_at"], idHistory],
    ["Admin access", "Roles and permissions assigned to administrators.", ["id", "user_id", "roles", "permissions", "is_active", "assigned_by", "created_at", "updated_at"], adminAccess],
    ["Admin activity logs", "Privileged administrative actions.", ["id", "admin_user_id", "action_type", "target_type", "target_id", "description", "ip_address", "metadata", "created_at"], adminLogs],
  ] as const;
  return <div className="content"><div className="section-head"><div><p className="eyebrow">Database control room</p><h2>Data explorer</h2><p className="muted">Browse the connected BINZEO tables with safe fields, per-table filtering and row counts.</p></div><span className="badge good">{blocks.length} tables visible</span></div><div className="explorer-summary"><div className="card"><strong>Safe by default</strong><p className="muted">No passwords, tokens, OTP hashes, passkey hashes, credential IDs or private keys are rendered.</p></div><div className="card"><strong>Live connection</strong><p className="muted">Every section reads from the shared Supabase project through the authenticated admin session.</p></div></div><div className="explorer-list">{blocks.map(([title, description, columns, rows]) => <DataTable key={title} title={title} description={description} columns={[...columns]} rows={rows} />)}<DataTable title="Email verification challenges" description="Private OTP challenge store." columns={[]} rows={[]} sensitive /><DataTable title="Passkey challenges" description="Private WebAuthn challenge store." columns={[]} rows={[]} sensitive /></div></div>;
}
