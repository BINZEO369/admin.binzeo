/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import UserDataSection from "@/components/UserDataSection";

type Row = Record<string, unknown>;
type Profile = Row & { id: string; display_name?: string | null; binzeo_user_id?: string | null; username?: string | null; account_status?: string | null; profile_photo_url?: string | null };

const datasets = [
  ["Contacts", "user_contacts", ["id", "contact_type", "contact_value", "label", "is_primary", "is_verified", "created_at", "updated_at"]],
  ["Addresses", "user_addresses", ["id", "address_type", "address_line_1", "address_line_2", "address_line_3", "country_code", "state_province", "district", "city", "area", "postal_code", "latitude", "longitude", "is_primary", "location_accuracy_meters", "location_source", "created_at", "updated_at"]],
  ["Devices", "user_devices", ["id", "device_id", "device_name", "device_type", "operating_system", "os_version", "browser", "browser_version", "app_version", "last_seen_at", "is_trusted", "created_at"]],
  ["Login history", "user_login_history", ["id", "login_method", "login_status", "ip_address", "device_id", "user_agent", "country", "city", "login_at", "logout_at", "latitude", "longitude", "location_accuracy_meters", "location_source"]],
  ["User activity", "user_activity_logs", ["id", "activity_type", "activity_description", "ip_address", "device_id", "metadata", "created_at"]],
  ["Authentication methods", "user_auth_methods", ["id", "provider", "auth_method", "provider_identity_id", "provider_email", "first_seen_at", "signup_at", "last_sign_in_at", "login_count", "last_event", "metadata", "created_at", "updated_at"]],
  ["Verification records", "user_verification_records", ["id", "verification_type", "verification_status", "source_of_truth", "verified_at", "last_requested_at", "expires_at", "attempt_count", "metadata", "created_at", "updated_at"]],
  ["Passkey metadata", "user_passkeys", ["id", "sign_count", "authenticator_type", "device_name", "transports", "aaguid", "is_discoverable", "is_backed_up", "last_used_at", "expires_at", "revoked_at", "metadata", "created_at", "updated_at"]],
  ["Two-factor settings", "user_two_factor_settings", ["user_id", "enabled", "method", "enabled_at", "disabled_at", "created_at", "updated_at"]],
  ["Two-factor events", "two_factor_authentication_events", ["id", "email", "event_type", "login_method", "challenge_id", "status", "ip_address", "user_agent", "provider_message_id", "sent_at", "verified_at", "metadata", "created_at"]],
  ["Two-factor challenge lifecycle", "two_factor_challenges", ["id", "email", "login_method", "expires_at", "attempt_count", "max_attempts", "consumed_at", "verified_at", "request_ip", "email_delivery_status", "email_sent_at", "email_error", "created_at"]],
  ["Email verification lifecycle", "email_verification_challenges", ["id", "expires_at", "attempt_count", "max_attempts", "last_attempt_at", "consumed_at", "verified_at", "request_ip", "created_at"]],
  ["Password reset lifecycle", "password_reset_challenges", ["id", "email", "purpose", "expires_at", "attempt_count", "max_attempts", "last_attempt_at", "consumed_at", "verified_at", "request_ip", "email_delivery_status", "email_sent_at", "email_error", "created_at", "password_changed_at"]],
  ["Password change events", "password_change_events", ["id", "challenge_id", "email", "source", "changed_at", "notification_status", "notification_sent_at", "notification_attempt_count", "last_error", "provider_message_id", "metadata", "created_at", "updated_at"]],
  ["Welcome email deliveries", "welcome_email_deliveries", ["id", "email", "template_version", "status", "attempt_count", "sent_at", "last_attempt_at", "next_attempt_at", "last_error", "provider_message_id", "metadata", "created_at", "updated_at"]],
  ["Birthday record", "user_birthdays", ["user_id", "birth_date", "birth_year", "birth_month", "birth_day", "current_age", "age_calculated_at", "next_birthday_date", "email", "display_name", "created_at", "updated_at"]],
  ["Sector access", "user_sector_access", ["user_id", "sector_id", "status", "selected_at", "updated_at"]],
  ["Profile images", "profile_images", ["user_id", "profile_id", "image_url", "image_public_id", "created_at", "updated_at"]],
  ["Deleted profile images", "profile_deleted_images", ["id", "profile_id", "image_url", "image_public_id", "deletion_reason", "deleted_at"]],
  ["Login attempt limits", "login_attempt_limits", ["id", "scope_type", "scope_key", "account_email", "request_ip", "window_date", "attempt_count", "first_attempt_at", "last_attempt_at", "created_at", "updated_at", "lockout_until"]],
  ["Exceeded login limits", "login_limit_exceeded", ["id", "account_email", "account_key", "request_ip", "window_date", "account_attempts", "ip_attempts", "daily_limit", "blocked_count", "first_blocked_at", "last_blocked_at", "created_at", "updated_at"]],
] as const;

export default async function UserDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const db = await createClient();
  const { data: profile, error } = await db.from("profiles").select("*").eq("id", id).maybeSingle();
  if (error || !profile) notFound();
  const results = await Promise.all(datasets.map(([, table, columns]) => db.from(table).select(columns.join(", ")).eq("user_id", id).limit(500)));
  const rows = results.map((result) => (result.data ?? []) as unknown as Row[]);
  const user = profile as Profile;
  const profileFields = Object.keys(user).filter((field) => field !== "profile_photo_url");
  const profileRow = Object.fromEntries(profileFields.map((field) => [field, user[field]]));
  const title = user.display_name || user.binzeo_user_id || user.username || "User account";

  return <div className="content"><p><Link className="muted" href="/dashboard/users">← Back to active users</Link></p>
    <section className="user-hero"><div className="user-identity">{user.profile_photo_url ? <img className="user-hero-avatar" src={user.profile_photo_url} alt="" /> : <span className="user-hero-avatar user-hero-fallback">{title.slice(0, 1).toUpperCase()}</span>}<div><p className="eyebrow">Complete user account</p><h2>{title}</h2><p className="muted">{user.binzeo_user_id || "No BINZEO ID"} · @{user.username || "no-username"}</p></div></div><div className="user-hero-status"><span className={`badge ${user.account_status === "active" ? "good" : "warn"}`}>{user.account_status || "unknown"}</span><p className="muted">{rows.reduce((sum, items) => sum + items.length, 0)} linked records</p></div></section>
    <p className="protected-note" style={{ margin: "18px 0" }}><strong>Security note:</strong> raw passwords, OTP/code hashes, passkey keys and temporary token hashes are intentionally excluded. Their lifecycle, status, timestamps and audit metadata are shown where available.</p>
    <UserDataSection title="Profile / all fields" description="The complete profile record, including preferences, consent and account lifecycle fields." columns={profileFields} rows={[profileRow]} />
    {datasets.map(([sectionTitle, , columns], index) => <UserDataSection key={sectionTitle} title={sectionTitle} description={sectionTitle.includes("lifecycle") || sectionTitle.includes("limits") ? "Security lifecycle metadata and timestamps. Secret values are excluded." : undefined} columns={[...columns]} rows={rows[index]} />)}
  </div>;
}
