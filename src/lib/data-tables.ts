export type TableDefinition = {
  slug: string;
  table: string;
  title: string;
  description: string;
  columns: string[];
  sensitive?: boolean;
};

export const DATA_TABLES: TableDefinition[] = [
  { slug: "profiles", table: "profiles", title: "Profiles", description: "Core user accounts and account status.", columns: ["id", "binzeo_user_id", "display_name", "username", "country_code", "account_status", "created_at"] },
  { slug: "user-contacts", table: "user_contacts", title: "Contacts", description: "User contact channels and verification state.", columns: ["id", "user_id", "contact_type", "contact_value", "label", "is_primary", "is_verified", "created_at"] },
  { slug: "user-addresses", table: "user_addresses", title: "Addresses", description: "User address and location records.", columns: ["id", "user_id", "address_type", "country_code", "state_province", "district", "city", "area", "postal_code", "is_primary", "created_at"] },
  { slug: "sectors", table: "sectors", title: "Sectors", description: "Available business sectors.", columns: ["id", "sector_code", "sector_name", "description", "is_active", "created_at"] },
  { slug: "user-sector-access", table: "user_sector_access", title: "User sector access", description: "The sector membership join table.", columns: ["user_id", "sector_id", "status", "selected_at", "updated_at"] },
  { slug: "user-devices", table: "user_devices", title: "Devices", description: "Registered devices and trust state.", columns: ["id", "user_id", "device_id", "device_name", "device_type", "operating_system", "browser", "last_seen_at", "is_trusted", "created_at"] },
  { slug: "user-login-history", table: "user_login_history", title: "Login history", description: "Authentication events and locations.", columns: ["id", "user_id", "login_method", "login_status", "ip_address", "device_id", "country", "city", "login_at", "logout_at"] },
  { slug: "user-activity-logs", table: "user_activity_logs", title: "User activity logs", description: "User-level audit and activity records.", columns: ["id", "user_id", "activity_type", "activity_description", "ip_address", "device_id", "metadata", "created_at"] },
  { slug: "user-auth-methods", table: "user_auth_methods", title: "Auth methods", description: "Safe provider and authentication summaries.", columns: ["id", "user_id", "provider", "auth_method", "provider_email", "first_seen_at", "last_sign_in_at", "login_count", "last_event", "created_at"] },
  { slug: "user-verification-records", table: "user_verification_records", title: "Verification records", description: "Verification status and timing metadata.", columns: ["id", "user_id", "verification_type", "verification_status", "source_of_truth", "verified_at", "last_requested_at", "expires_at", "attempt_count", "created_at"] },
  { slug: "user-passkeys", table: "user_passkeys", title: "Passkeys", description: "Safe WebAuthn credential metadata; keys are never shown.", columns: ["id", "user_id", "device_name", "authenticator_type", "transports", "aaguid", "is_discoverable", "is_backed_up", "last_used_at", "expires_at", "revoked_at", "created_at"] },
  { slug: "profile-id-history", table: "profile_id_history", title: "Profile ID history", description: "BINZEO ID transition audit history.", columns: ["id", "user_id", "previous_binzeo_user_id", "new_binzeo_user_id", "change_reason", "changed_at"] },
  { slug: "admin-access", table: "admin_access", title: "Admin access", description: "Roles and permissions assigned to administrators.", columns: ["id", "user_id", "roles", "permissions", "is_active", "assigned_by", "created_at", "updated_at"] },
  { slug: "admin-activity-logs", table: "admin_activity_logs", title: "Admin activity logs", description: "Privileged administrative actions.", columns: ["id", "admin_user_id", "action_type", "target_type", "target_id", "description", "ip_address", "metadata", "created_at"] },
  { slug: "email-verification-challenges", table: "email_verification_challenges", title: "Email verification challenges", description: "Private OTP challenge store.", columns: [], sensitive: true },
  { slug: "passkey-challenges", table: "passkey_challenges", title: "Passkey challenges", description: "Private WebAuthn challenge store.", columns: [], sensitive: true },
];

export function getTableDefinition(slug: string) {
  return DATA_TABLES.find(item => item.slug === slug);
}
