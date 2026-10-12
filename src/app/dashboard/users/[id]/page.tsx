/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import UserDataSection from "@/components/UserDataSection";
import AccountStatusActions from "@/components/AccountStatusActions";

/* ================= TOKENS ================= */
const T = {
  black: "#0A0A0A", ink: "#171717", gray700: "#404040", muted: "#737373",
  faint: "#A3A3A3", gray300: "#D4D4D4", line: "#E5E5E5", soft: "#F5F5F5",
  canvas: "#FAFAFA", surface: "#FFFFFF",
};
const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';
const SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif';
const SHADES = ["#0A0A0A", "#404040", "#737373", "#A3A3A3", "#D4D4D4", "#E5E5E5"];

type Row = Record<string, unknown>;
type Profile = Row & {
  id: string; display_name?: string | null; binzeo_user_id?: string | null;
  username?: string | null; account_status?: string | null;
  profile_photo_url?: string | null; created_at?: string | null;
};

/* ================= DATASETS (unchanged) ================= */
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

/* ================= DATASET METADATA ================= */
const DATASET_META: Record<string, { purpose: string; sensitive: boolean }> = {
  user_contacts: { purpose: "Verified phone, email and alternate contact channels used for sign-in, alerts and account recovery.", sensitive: false },
  user_addresses: { purpose: "Physical and service addresses on file, with geo-precision and source-of-truth context.", sensitive: false },
  user_devices: { purpose: "Hardware and browsers this account has authenticated from. Trusted devices skip extra verification.", sensitive: false },
  user_login_history: { purpose: "Every authentication attempt for this account — method, outcome, IP and geo-context.", sensitive: false },
  user_activity_logs: { purpose: "In-product events tied to this user — actions they took inside the app.", sensitive: false },
  user_auth_methods: { purpose: "Federated and local sign-in providers linked to this account, with last-use timeline.", sensitive: false },
  user_verification_records: { purpose: "Identity and document verification attempts — type, provider, outcome and expiry.", sensitive: false },
  user_passkeys: { purpose: "WebAuthn credential metadata (sign count, authenticator, backup flag). Private keys are never stored here.", sensitive: true },
  user_two_factor_settings: { purpose: "Whether a second factor is enabled for this account and which method is active.", sensitive: true },
  two_factor_authentication_events: { purpose: "Full lifecycle of 2FA OTP delivery and verification — sent, verified, expired or failed.", sensitive: true },
  two_factor_challenges: { purpose: "Short-lived 2FA challenges. Codes and hashes are intentionally excluded.", sensitive: true },
  email_verification_challenges: { purpose: "Email-verification challenges — creation, attempts, expiry and final outcome.", sensitive: true },
  password_reset_challenges: { purpose: "Password-reset challenges and their results. Reset tokens and hashes are excluded.", sensitive: true },
  password_change_events: { purpose: "Timeline of actual password updates plus notification delivery status.", sensitive: true },
  welcome_email_deliveries: { purpose: "Delivery status of onboarding / welcome email — attempts, errors, provider message id.", sensitive: false },
  user_birthdays: { purpose: "Birth date and derived age fields — drives age-based access rules and greetings.", sensitive: false },
  user_sector_access: { purpose: "Which business sectors this user selected and their current access status.", sensitive: false },
  profile_images: { purpose: "Current profile photo assets and their storage identifiers.", sensitive: false },
  profile_deleted_images: { purpose: "Audit trail of profile photos removed by the user, with reason and timestamp.", sensitive: false },
  login_attempt_limits: { purpose: "Rate-limit windows currently tracking this account or its IP addresses.", sensitive: true },
  login_limit_exceeded: { purpose: "Times this account or IP hit the daily login limit — useful for spotting brute-force attempts.", sensitive: true },
};

/* ================= CATEGORIES ================= */
type CategoryDef = {
  id: string; letter: string; title: string; purpose: string; tables: readonly string[];
};
const CATEGORIES: CategoryDef[] = [
  {
    id: "identity", letter: "I", title: "Identity & Profile",
    purpose: "The canonical picture of who this user is — their name, contacts, addresses, birthdays and photos.",
    tables: ["__profile__", "user_contacts", "user_addresses", "user_birthdays", "profile_images", "profile_deleted_images"],
  },
  {
    id: "security", letter: "S", title: "Authentication & Security",
    purpose: "How this account signs in, what factors protect it and every credential lifecycle event.",
    tables: ["user_auth_methods", "user_passkeys", "user_two_factor_settings", "two_factor_authentication_events", "two_factor_challenges", "email_verification_challenges", "password_reset_challenges", "password_change_events", "user_verification_records"],
  },
  {
    id: "sessions", letter: "D", title: "Sessions & Devices",
    purpose: "Where this account has been used from — hardware, browsers and every login attempt.",
    tables: ["user_devices", "user_login_history"],
  },
  {
    id: "abuse", letter: "R", title: "Rate Limiting & Abuse",
    purpose: "Rate-limit state and lockout history that protect this account from brute-force attempts.",
    tables: ["login_attempt_limits", "login_limit_exceeded"],
  },
  {
    id: "activity", letter: "A", title: "Activity & Communications",
    purpose: "What the user did inside the product and which outbound messages reached them.",
    tables: ["user_activity_logs", "user_sector_access", "welcome_email_deliveries"],
  },
];

/* ================= HELPERS ================= */
const fmt = (n: number) => n.toLocaleString("en-US");
const localKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const ago = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
};
const dayFmt = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
const safeStr = (v: unknown, fb = "—") =>
  v === null || v === undefined || v === "" ? fb : String(v);
const tsOf = (r: Row, ...keys: string[]): string | null => {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === "string" && v) return v;
  }
  return null;
};

/* ================= ANIMATED CSS ================= */
const ANIM_CSS = `
  @keyframes bzDraw   { to { stroke-dashoffset: 0; } }
  @keyframes bzFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes bzPop    { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
  @keyframes bzGrowY  { from { transform: scaleY(0); } to { transform: scaleY(1); } }
  @keyframes bzRiseUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes bzGauge  { to { stroke-dashoffset: 0; } }
  @keyframes bzPulse  { 0%,100% { opacity: 1; } 50% { opacity: .28; } }
  @keyframes bzRipple { 0%{ box-shadow: 0 0 0 0 rgba(10,10,10,.14);} 100%{ box-shadow: 0 0 0 14px rgba(10,10,10,0);} }

  .bz-line-path { stroke-dasharray: 2000; stroke-dashoffset: 2000; animation: bzDraw 1.4s cubic-bezier(.4,0,.2,1) forwards; }
  .bz-spark-line { stroke-dasharray: 500; stroke-dashoffset: 500; animation: bzDraw 1s cubic-bezier(.4,0,.2,1) forwards; }
  .bz-area-path { opacity: 0; animation: bzFadeIn .9s ease-out .4s forwards; }
  .bz-spark-area { opacity: 0; animation: bzFadeIn .7s ease-out .3s forwards; }
  .bz-point-dot { transform-box: fill-box; transform-origin: center; opacity: 0; animation: bzPop .35s ease-out forwards; }
  .bz-spark-dot { transform-box: fill-box; transform-origin: center; opacity: 0; animation: bzPop .35s ease-out 1s forwards; }
  .bz-bar-rect { transform-box: fill-box; transform-origin: bottom; transform: scaleY(0); animation: bzGrowY .75s cubic-bezier(.2,.7,.2,1) forwards; }
  .bz-heat-cell { opacity: 0; animation: bzFadeIn .5s ease-out forwards; }
  .bz-donut-seg { opacity: 0; animation: bzFadeIn .8s ease-out forwards; }
  .bz-gauge-arc { animation: bzGauge 1.1s cubic-bezier(.4,0,.2,1) forwards; }
  .bz-fade-up { opacity: 0; animation: bzRiseUp .55s cubic-bezier(.2,.7,.2,1) forwards; }
  .bz-number { display: inline-block; opacity: 0; animation: bzRiseUp .5s ease-out forwards; }
  .bz-pulse { animation: bzPulse 2.2s ease-in-out infinite; }
  .bz-card { transition: transform .22s cubic-bezier(.2,.7,.2,1), border-color .22s ease, box-shadow .22s ease; }
  .bz-card:hover { transform: translateY(-2px); border-color: ${T.black}; box-shadow: 0 14px 32px -22px rgba(0,0,0,.24); }
  .bz-chip { transition: background .18s ease, color .18s ease, border-color .18s ease; }
  .bz-chip:hover { background: ${T.black} !important; color: #fff !important; border-color: ${T.black} !important; }
  .bz-anchor { scroll-margin-top: 24px; }

  .bz-grid-kpi { grid-template-columns: repeat(5,1fr); }
  .bz-grid-snap { grid-template-columns: repeat(6,1fr); }
  .bz-grid-2 { grid-template-columns: 1.6fr 1fr; }
  .bz-grid-3 { grid-template-columns: 1fr 1fr 1fr; }
  .bz-grid-insights { grid-template-columns: 1.2fr 1fr; }
  @media (max-width:1200px){
    .bz-grid-kpi{grid-template-columns:repeat(3,1fr)!important}
    .bz-grid-3{grid-template-columns:1fr 1fr!important}
    .bz-grid-snap{grid-template-columns:repeat(3,1fr)!important}
  }
  @media (max-width:1100px){
    .bz-grid-kpi{grid-template-columns:repeat(2,1fr)!important}
    .bz-grid-2{grid-template-columns:1fr!important}
    .bz-grid-insights{grid-template-columns:1fr!important}
  }
  @media (max-width:640px){
    .bz-grid-kpi,.bz-grid-3,.bz-grid-snap{grid-template-columns:1fr!important}
  }
  @media (prefers-reduced-motion: reduce){
    .bz-line-path,.bz-spark-line,.bz-area-path,.bz-spark-area,.bz-point-dot,.bz-spark-dot,
    .bz-bar-rect,.bz-heat-cell,.bz-donut-seg,.bz-gauge-arc,.bz-fade-up,.bz-number{
      animation: none !important; opacity: 1 !important; transform: none !important; stroke-dashoffset: 0 !important;
    }
  }
`;

/* ================= CHART: Sparkline ================= */
function Sparkline({ data, w = 90, h = 30 }: { data: number[]; w?: number; h?: number }) {
  if (!data || data.length < 2) return <div style={{ width: w, height: h }} aria-hidden />;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => [i * step, h - ((v - min) / range) * (h - 6) - 3] as const);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  const gid = `sp-${Math.random().toString(36).slice(2, 8)}`;
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={h} style={{ display: "block", overflow: "visible" }} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={T.black} stopOpacity="0.16" />
          <stop offset="100%" stopColor={T.black} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} className="bz-spark-area" />
      <path d={line} fill="none" stroke={T.black} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" className="bz-spark-line" />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill={T.black} className="bz-spark-dot" />
    </svg>
  );
}

/* ================= CHART: Area ================= */
function AreaChart({ data, labels, height = 220 }: { data: number[]; labels: string[]; height?: number }) {
  const w = 720, h = height;
  const pad = { t: 20, r: 16, b: 30, l: 40 };
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const rawMax = Math.max(...data, 1);
  const niceMax = Math.max(3, Math.ceil(rawMax / 3) * 3);
  const step = data.length > 1 ? iw / (data.length - 1) : iw;
  const pts = data.map((v, i) => [pad.l + i * step, pad.t + ih - (v / niceMax) * ih] as const);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${pad.t + ih} L${pad.l},${pad.t + ih} Z`;
  const tickEvery = Math.max(1, Math.ceil(labels.length / 10));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height, display: "block" }}>
      <defs>
        <linearGradient id="bzUserArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={T.black} stopOpacity="0.14" />
          <stop offset="100%" stopColor={T.black} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((r) => {
        const y = pad.t + ih * r;
        return (
          <g key={r}>
            <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke={T.line} strokeDasharray="3 5" />
            <text x={pad.l - 8} y={y + 3} fontSize="10" fill={T.faint} textAnchor="end" fontFamily={MONO}>
              {Math.round(niceMax * (1 - r))}
            </text>
          </g>
        );
      })}
      <path d={area} fill="url(#bzUserArea)" className="bz-area-path" />
      <path d={line} fill="none" stroke={T.black} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" className="bz-line-path" />
      {pts.map((p, i) =>
        i % tickEvery === 0 || i === pts.length - 1 ? (
          <g key={i}>
            <circle cx={p[0]} cy={p[1]} r="3" fill={T.surface} stroke={T.black} strokeWidth="1.8"
              className="bz-point-dot" style={{ animationDelay: `${0.5 + i * 0.03}s` }} />
            <text x={p[0]} y={h - 8} fontSize="10" fill={T.muted} textAnchor="middle" fontFamily={MONO}>{labels[i] ?? ""}</text>
          </g>
        ) : null
      )}
    </svg>
  );
}

/* ================= CHART: Donut ================= */
function Donut({ segments, size = 180, centerLabel = "TOTAL", centerValue }: {
  segments: { label: string; value: number }[]; size?: number;
  centerLabel?: string; centerValue?: number;
}) {
  const total = segments.reduce((a, b) => a + b.value, 0);
  const displayTotal = typeof centerValue === "number" ? centerValue : total;
  const cx = 110, cy = 110, r = 76, stroke = 20;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 220 220" width={size} height={size} style={{ display: "block" }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={T.soft} strokeWidth={stroke} />
      {total > 0 && segments.map((s, i) => {
        const len = (s.value / total) * circ;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={SHADES[i % SHADES.length]} strokeWidth={stroke}
            strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            className="bz-donut-seg" style={{ animationDelay: `${i * 0.14}s` }} />
        );
        offset += len;
        return el;
      })}
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="30" fontWeight="700" fill={T.black} fontFamily={SANS} letterSpacing="-0.03em"
        className="bz-number" style={{ animationDelay: ".3s" }}>
        {fmt(displayTotal)}
      </text>
      <text x={cx} y={cy + 18} textAnchor="middle" fontSize="9" fill={T.muted} fontFamily={MONO} letterSpacing="0.14em"
        className="bz-number" style={{ animationDelay: ".4s" }}>
        {centerLabel}
      </text>
    </svg>
  );
}

/* ================= CHART: Day Heatmap ================= */
function DayHeatmap({ cells }: { cells: number[] }) {
  const cell = 22, gap = 4, topPad = 4;
  const cols = 24;
  const w = cols * (cell + gap) - gap + 2;
  const h = topPad + cell + 22;
  const max = Math.max(...cells, 1);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", display: "block" }}>
      {cells.map((v, c) => {
        const inten = v / max;
        const fill = v === 0 ? T.soft : `rgba(10,10,10,${(0.08 + inten * 0.92).toFixed(3)})`;
        return (
          <rect key={c} x={c * (cell + gap)} y={topPad} width={cell} height={cell} rx="3" fill={fill}
            className="bz-heat-cell" style={{ animationDelay: `${c * 0.015}s` }} />
        );
      })}
      {[0, 6, 12, 18, 23].map((hr) => (
        <text key={hr} x={hr * (cell + gap) + cell / 2} y={topPad + cell + 14}
          fontSize="10" fill={T.muted} textAnchor="middle" fontFamily={MONO}>
          {String(hr).padStart(2, "0")}
        </text>
      ))}
    </svg>
  );
}

/* ================= CHART: Week Bars ================= */
function WeekBars({ data, labels, height = 180 }: { data: number[]; labels: string[]; height?: number }) {
  const w = 480, h = height;
  const pad = { t: 20, r: 12, b: 28, l: 28 };
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const max = Math.max(...data, 1);
  const slot = iw / Math.max(data.length, 1);
  const bw = Math.min(slot * 0.55, 32);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height, display: "block" }}>
      {[0, 0.5, 1].map((r) => (
        <line key={r} x1={pad.l} x2={w - pad.r} y1={pad.t + ih * r} y2={pad.t + ih * r} stroke={T.line} strokeDasharray="3 5" />
      ))}
      {data.map((v, i) => {
        const bh = (v / max) * ih;
        const x = pad.l + i * slot + (slot - bw) / 2;
        const y = pad.t + ih - bh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={bh} rx="3" fill={T.black}
              className="bz-bar-rect" style={{ animationDelay: `${i * 0.05}s` }} />
            {v > 0 && (
              <text x={x + bw / 2} y={y - 5} textAnchor="middle" fontSize="9.5" fill={T.black} fontFamily={MONO} fontWeight="600"
                className="bz-number" style={{ animationDelay: `${0.5 + i * 0.05}s` }}>
                {v}
              </text>
            )}
            <text x={x + bw / 2} y={h - 10} textAnchor="middle" fontSize="10" fill={T.muted} fontFamily={MONO}>{labels[i] ?? ""}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ================= UI COMPONENTS ================= */
function Panel({ title, eyebrow, action, children, delay = 0 }: {
  title: string; eyebrow?: string; action?: ReactNode; children: ReactNode; delay?: number;
}) {
  return (
    <div className="bz-fade-up" style={{
      background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16, padding: 20,
      display: "flex", flexDirection: "column", gap: 14, minWidth: 0, animationDelay: `${delay}s`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          {eyebrow && (
            <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: MONO }}>{eyebrow}</p>
          )}
          <h3 style={{ margin: "5px 0 0", fontSize: 15.5, fontWeight: 650, letterSpacing: "-0.02em", color: T.black }}>{title}</h3>
        </div>
        {action}
      </div>
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}

function KPICard({ label, value, detail, spark, index, accent, delay = 0 }: {
  label: string; value: number | string; detail: string; spark?: number[]; index: number;
  accent?: "ok" | "warn" | "bad"; delay?: number;
}) {
  const dotColor = accent === "warn" ? T.gray700 : accent === "bad" ? T.faint : T.black;
  return (
    <div className="bz-fade-up" style={{
      background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14,
      padding: "16px 18px 14px", display: "flex", flexDirection: "column", gap: 12,
      minHeight: 150, minWidth: 0, animationDelay: `${delay}s`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: MONO }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 10, color: T.faint, border: `1px solid ${T.line}`, borderRadius: 999, padding: "2px 6px" }}>
          {String(index).padStart(2, "0")}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}>
        <div className="bz-number" style={{ fontSize: 34, lineHeight: 1, fontWeight: 700, letterSpacing: "-0.035em", color: T.black, fontVariantNumeric: "tabular-nums", animationDelay: `${delay + 0.1}s` }}>
          {typeof value === "number" ? fmt(value) : value}
        </div>
        {spark && spark.length >= 2 && <Sparkline data={spark} w={80} h={26} />}
      </div>
      <div style={{ marginTop: "auto", paddingTop: 10, borderTop: `1px solid ${T.line}`, display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: T.muted }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: dotColor, flexShrink: 0 }} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{detail}</span>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono = true }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <li style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 14, padding: "10px 0", borderBottom: `1px solid ${T.line}` }}>
      <span style={{ fontSize: 11, color: T.muted, fontFamily: MONO, textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12.5, color: T.ink, fontWeight: 600, fontFamily: mono ? MONO : SANS, textAlign: "right", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
    </li>
  );
}

function RiskBar({ score, level }: { score: number; level: "good" | "warn" | "bad" }) {
  const pct = Math.max(0, Math.min(score, 100));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted }}>
          {level === "good" ? "Trust score" : level === "warn" ? "Attention needed" : "At risk"}
        </span>
        <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 13, color: T.black }}>{pct}/100</span>
      </div>
      <div style={{ height: 6, background: T.soft, borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: T.black, transition: "width 1s cubic-bezier(.2,.7,.2,1)" }} />
      </div>
    </div>
  );
}

function SnapshotCard({ label, value, sub, delay = 0 }: { label: string; value: string; sub?: string; delay?: number }) {
  return (
    <div className="bz-fade-up" style={{
      background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12,
      padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6, minWidth: 0,
      animationDelay: `${delay}s`,
    }}>
      <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: T.muted, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 700, color: T.black, letterSpacing: "-0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={value}>{value}</span>
      {sub && <span style={{ fontFamily: MONO, fontSize: 10.5, color: T.faint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</span>}
    </div>
  );
}

function CategoryHeader({ letter, title, purpose, rows, tables, id }: {
  letter: string; title: string; purpose: string; rows: number; tables: number; id: string;
}) {
  return (
    <div id={`cat-${id}`} className="bz-anchor bz-fade-up" style={{
      display: "flex", gap: 16, alignItems: "flex-start",
      padding: "20px 22px", marginTop: 24, marginBottom: 14,
      background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16,
      animationDelay: ".02s",
    }}>
      <span style={{
        width: 40, height: 40, borderRadius: 12, background: T.black, color: "#fff",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", flexShrink: 0,
      }}>{letter}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 6 }}>
          <h2 style={{ margin: 0, fontSize: "clamp(18px, 2vw, 22px)", fontWeight: 700, letterSpacing: "-0.02em", color: T.black }}>{title}</h2>
          <span style={{ fontFamily: MONO, fontSize: 10.5, color: T.muted, border: `1px solid ${T.line}`, borderRadius: 999, padding: "3px 10px" }}>
            {tables} sections · {fmt(rows)} rows
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: T.muted }}>{purpose}</p>
      </div>
    </div>
  );
}

function SectionHeader({ index, title, count, sensitive, purpose }: {
  index: string; title: string; count: number; sensitive: boolean; purpose: string;
}) {
  return (
    <div style={{
      padding: "14px 16px 12px", background: T.surface,
      border: `1px solid ${T.line}`, borderBottom: "none",
      borderRadius: "12px 12px 0 0", marginBottom: -1,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span style={{
            fontFamily: MONO, fontSize: 10.5, fontWeight: 700,
            color: T.faint, border: `1px solid ${T.line}`, borderRadius: 6,
            padding: "2px 7px", flexShrink: 0,
          }}>{index}</span>
          <span style={{ fontSize: 13.5, fontWeight: 650, color: T.black, letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {title}
          </span>
          <span style={{ fontFamily: MONO, fontSize: 11, color: T.muted, flexShrink: 0 }}>
            {count} {count === 1 ? "row" : "rows"}
          </span>
        </div>
        <span style={{
          fontSize: 9.5, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600,
          color: sensitive ? "#fff" : T.black,
          background: sensitive ? T.black : "#fff",
          border: `1px solid ${T.black}`, borderRadius: 999, padding: "3px 9px", flexShrink: 0,
        }}>
          {sensitive ? "Protected" : "Standard"}
        </span>
      </div>
      <p style={{ margin: "8px 0 0", fontSize: 12, lineHeight: 1.55, color: T.muted, maxWidth: 780 }}>
        {purpose}
      </p>
    </div>
  );
}

/* ================= PAGE ================= */
export default async function UserDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const db = await createClient();

  const { data: profile, error } = await db.from("profiles").select("*").eq("id", id).maybeSingle();
  if (error || !profile) notFound();

  const results = await Promise.all(
    datasets.map(([, table, columns]) =>
      db.from(table).select(columns.join(", ")).eq("user_id", id).limit(500)
    )
  );
  const rows = results.map((result) => (result.data ?? []) as unknown as Row[]);
  const dataByTable = new Map<string, Row[]>();
  datasets.forEach(([, table], i) => dataByTable.set(table, rows[i]));

  const user = profile as Profile;
  const profileFields = Object.keys(user).filter((field) => field !== "profile_photo_url");
  const profileRow = Object.fromEntries(profileFields.map((field) => [field, user[field]]));
  const title = user.display_name || user.binzeo_user_id || user.username || "User account";

  /* -------- slices -------- */
  const logins = dataByTable.get("user_login_history") ?? [];
  const activities = dataByTable.get("user_activity_logs") ?? [];
  const devices = dataByTable.get("user_devices") ?? [];
  const authMethods = dataByTable.get("user_auth_methods") ?? [];
  const verifications = dataByTable.get("user_verification_records") ?? [];
  const twoFactor = dataByTable.get("user_two_factor_settings") ?? [];
  const contacts = dataByTable.get("user_contacts") ?? [];
  const limits = dataByTable.get("login_attempt_limits") ?? [];
  const passkeys = dataByTable.get("user_passkeys") ?? [];
  const birthdays = dataByTable.get("user_birthdays") ?? [];
  const addresses = dataByTable.get("user_addresses") ?? [];
  const sectorAccess = dataByTable.get("user_sector_access") ?? [];
  const welcomeEmails = dataByTable.get("welcome_email_deliveries") ?? [];

  const totalLinked = rows.reduce((s, r) => s + r.length, 0);

  /* -------- login analytics -------- */
  const loginSuccess = logins.filter((r) => String(r.login_status ?? "").toLowerCase().includes("success")).length;
  const loginFailed = logins.filter((r) => {
    const s = String(r.login_status ?? "").toLowerCase();
    return s.includes("fail") || s.includes("error") || s.includes("denied") || s.includes("invalid");
  }).length;
  const successRate = logins.length > 0 ? Math.round((loginSuccess / logins.length) * 100) : 0;

  /* -------- 30d trend -------- */
  const trendDays = 30;
  const dayKeys: string[] = [];
  const dayLabels: string[] = [];
  for (let i = trendDays - 1; i >= 0; i--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    dayKeys.push(localKey(d));
    dayLabels.push(d.toLocaleDateString("en-US", { weekday: "short" }));
  }
  const perDay = new Map<string, number>();
  logins.forEach((r) => {
    const ts = tsOf(r, "login_at", "created_at");
    if (!ts) return;
    const k = localKey(new Date(ts));
    perDay.set(k, (perDay.get(k) ?? 0) + 1);
  });
  const loginTrend = dayKeys.map((k) => perDay.get(k) ?? 0);

  /* -------- 7d bars -------- */
  const weekKeys: string[] = [];
  const weekLabels: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    weekKeys.push(localKey(d));
    weekLabels.push(d.toLocaleDateString("en-US", { weekday: "short" }));
  }
  const weekBars = weekKeys.map((k) => perDay.get(k) ?? 0);

  /* -------- 24h heatmap -------- */
  const hourCells = Array(24).fill(0) as number[];
  logins.forEach((r) => {
    const ts = tsOf(r, "login_at", "created_at");
    if (!ts) return;
    hourCells[new Date(ts).getHours()]++;
  });
  const peakHour = hourCells.some((v) => v > 0) ? hourCells.indexOf(Math.max(...hourCells)) : null;

  /* -------- distributions -------- */
  const deviceMap = new Map<string, number>();
  devices.forEach((d) => {
    const k = String(d.device_type ?? d.operating_system ?? "unknown").trim() || "unknown";
    deviceMap.set(k, (deviceMap.get(k) ?? 0) + 1);
  });
  const deviceSegments = Array.from(deviceMap.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 5);

  const authMap = new Map<string, number>();
  authMethods.forEach((a) => {
    const k = String(a.provider ?? a.auth_method ?? "unknown").trim() || "unknown";
    authMap.set(k, (authMap.get(k) ?? 0) + 1);
  });
  const authSegments = Array.from(authMap.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 5);

  /* -------- derived flags -------- */
  const trustedDevices = devices.filter((d) => d.is_trusted === true).length;
  const verifiedContacts = contacts.filter((c) => c.is_verified === true).length;
  const verifiedCount = verifications.filter((v) => {
    const s = String(v.verification_status ?? "").toLowerCase();
    return s.includes("verif") && !s.includes("un");
  }).length;
  const twoFactorEnabled = twoFactor.some((r) => r.enabled === true);
  const activeLockouts = limits.filter((r) => {
    const lu = r.lockout_until;
    if (!lu) return false;
    return new Date(String(lu)).getTime() > Date.now();
  }).length;

  /* -------- last activity -------- */
  const allTs: string[] = [];
  logins.forEach((r) => { const t = tsOf(r, "login_at", "created_at"); if (t) allTs.push(t); });
  activities.forEach((r) => { const t = tsOf(r, "created_at"); if (t) allTs.push(t); });
  const lastActivity = allTs.length ? allTs.reduce((a, b) => (a > b ? a : b)) : null;

  /* -------- account age -------- */
  const accountCreated = user.created_at ?? null;
  const accountAgeDays = accountCreated
    ? Math.floor((Date.now() - new Date(String(accountCreated)).getTime()) / 86400000)
    : null;
  const freshMinutes = lastActivity ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / 60000) : Infinity;

  /* -------- risk score -------- */
  let score = 100;
  if (!twoFactorEnabled) score -= 20;
  if (verifiedCount === 0) score -= 15;
  if (loginFailed > loginSuccess) score -= 20;
  if (activeLockouts > 0) score -= 25;
  if (trustedDevices === 0) score -= 10;
  if ((user.account_status ?? "").toLowerCase() !== "active") score -= 20;
  score = Math.max(0, Math.min(100, score));
  const riskLevel: "good" | "warn" | "bad" = score >= 70 ? "good" : score >= 40 ? "warn" : "bad";

  /* -------- feed -------- */
  type Feed = { kind: string; ts: string; label?: string | null };
  const feed: Feed[] = [
    ...logins.map((r): Feed => ({ kind: "login", ts: tsOf(r, "login_at", "created_at") ?? "", label: String(r.login_method ?? r.login_status ?? "") })),
    ...activities.map((r): Feed => ({ kind: "activity", ts: tsOf(r, "created_at") ?? "", label: String(r.activity_type ?? r.activity_description ?? "") })),
  ].filter((f) => f.ts).sort((a, b) => +new Date(b.ts) - +new Date(a.ts)).slice(0, 8);

  /* -------- snapshot values -------- */
  const primaryEmail = (
    contacts.find((c) => String(c.contact_type ?? "").toLowerCase().includes("email") && c.is_primary === true)
    ?? contacts.find((c) => String(c.contact_type ?? "").toLowerCase().includes("email"))
  )?.contact_value as string | undefined;
  const primaryPhone = (
    contacts.find((c) => String(c.contact_type ?? "").toLowerCase().includes("phone") && c.is_primary === true)
    ?? contacts.find((c) => String(c.contact_type ?? "").toLowerCase().includes("phone"))
  )?.contact_value as string | undefined;
  const primaryAddr = addresses[0];
  const locationStr = primaryAddr
    ? [primaryAddr.city, primaryAddr.country_code].filter(Boolean).join(", ") || "—"
    : "—";
  const birth = birthdays[0];
  const birthStr = birth?.birth_date ? dayFmt(String(birth.birth_date)) : "—";
  const ageStr = birth?.current_age ? `${birth.current_age} yrs` : "";

  /* -------- insights -------- */
  const insights: { label: string; value: string; tone: "ok" | "warn" | "bad" }[] = [];
  if (accountAgeDays !== null) insights.push({ label: "Account age", value: `${accountAgeDays} days`, tone: accountAgeDays > 30 ? "ok" : "warn" });
  if (lastActivity) insights.push({ label: "Last seen", value: ago(lastActivity), tone: freshMinutes < 1440 ? "ok" : freshMinutes < 10080 ? "warn" : "bad" });
  insights.push({ label: "2FA", value: twoFactorEnabled ? "Enabled" : "Not enabled", tone: twoFactorEnabled ? "ok" : "warn" });
  insights.push({ label: "Verified contacts", value: `${verifiedContacts} / ${contacts.length}`, tone: verifiedContacts > 0 ? "ok" : "warn" });
  insights.push({ label: "Trusted devices", value: `${trustedDevices} / ${devices.length}`, tone: trustedDevices > 0 ? "ok" : "warn" });
  if (peakHour !== null) insights.push({ label: "Peak hour", value: `${String(peakHour).padStart(2, "0")}:00`, tone: "ok" });
  insights.push({ label: "Passkeys", value: `${passkeys.length}`, tone: passkeys.length > 0 ? "ok" : "warn" });
  if (loginFailed > 0) insights.push({ label: "Failed logins", value: `${loginFailed}`, tone: loginFailed > loginSuccess ? "bad" : "warn" });
  if (activeLockouts > 0) insights.push({ label: "Active lockouts", value: `${activeLockouts}`, tone: "bad" });

  /* -------- status badge -------- */
  const isActive = (user.account_status ?? "").toLowerCase() === "active";
  const statusBadge = isActive ? { label: "Active", bg: T.black, fg: "#fff" } : { label: safeStr(user.account_status, "Unknown"), bg: "#fff", fg: T.black };

  /* -------- KPI values -------- */
  const kpis = [
    { label: "Logins", value: logins.length, detail: `${successRate}% success rate`, spark: weekBars },
    { label: "Activities", value: activities.length, detail: "Tracked account events", spark: undefined },
    { label: "Devices", value: devices.length, detail: `${trustedDevices} trusted`, spark: undefined },
    { label: "Auth methods", value: authMethods.length, detail: twoFactorEnabled ? "2FA enabled" : "2FA not enabled", spark: undefined },
    { label: "Verifications", value: verifiedCount, detail: `${verifications.length} attempts total`, spark: undefined },
  ];

  /* -------- dataset helpers -------- */
  const indexOfDataset = (tableName: string) => datasets.findIndex(([, t]) => t === tableName);
  const rowsFor = (tableName: string): Row[] =>
    tableName === "__profile__" ? [profileRow] : (dataByTable.get(tableName) ?? []);
  const metaFor = (tableName: string) =>
    tableName === "__profile__"
      ? { purpose: "The complete profile record — identity, preferences, consent flags and account lifecycle fields.", sensitive: false }
      : (DATASET_META[tableName] ?? { purpose: "", sensitive: false });

  const grandSections = CATEGORIES.reduce((s, c) => s + c.tables.length, 0);

  return (
    <div style={{ background: T.canvas, minHeight: "100%", padding: "32px clamp(20px, 4vw, 48px) 80px", color: T.ink, fontFamily: SANS }}>
      <style>{ANIM_CSS}</style>

      {/* ============ BREADCRUMB ============ */}
      <nav style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontFamily: MONO, fontSize: 11.5, color: T.muted }}>
        <Link href="/dashboard" style={{ color: T.muted, textDecoration: "none" }}>Control room</Link>
        <span style={{ color: T.faint }}>/</span>
        <Link href="/dashboard/users" style={{ color: T.muted, textDecoration: "none" }}>Users</Link>
        <span style={{ color: T.faint }}>/</span>
        <span style={{ color: T.black, fontWeight: 600 }}>{title}</span>
      </nav>

      {/* ============ HERO ============ */}
      <header className="bz-fade-up" style={{
        display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "space-between", alignItems: "flex-start",
        padding: 24, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, marginBottom: 20,
        animationDelay: ".05s",
      }}>
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start", minWidth: 0, flex: 1 }}>
          {user.profile_photo_url ? (
            <img src={user.profile_photo_url} alt=""
              style={{ width: 72, height: 72, borderRadius: 16, objectFit: "cover", flexShrink: 0, border: `1px solid ${T.line}` }} />
          ) : (
            <span style={{
              width: 72, height: 72, borderRadius: 16, background: T.black, color: "#fff",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: 30, fontWeight: 700, letterSpacing: "-0.03em", flexShrink: 0,
            }}>
              {title.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: MONO }}>
              Complete user account
            </p>
            <h1 style={{ margin: "6px 0 8px", fontSize: "clamp(24px, 3vw, 34px)", lineHeight: 1.05, fontWeight: 700, letterSpacing: "-0.03em", color: T.black }}>
              {title}
            </h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", fontFamily: MONO, fontSize: 11.5, color: T.muted }}>
              <span>BINZEO · {user.binzeo_user_id || "—"}</span>
              <span style={{ color: T.faint }}>·</span>
              <span>@{user.username || "no-username"}</span>
              {accountCreated && (<><span style={{ color: T.faint }}>·</span><span>joined {dayFmt(accountCreated)}</span></>)}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11.5, fontWeight: 700,
            fontFamily: MONO, letterSpacing: "0.08em", textTransform: "uppercase",
            color: statusBadge.fg, background: statusBadge.bg, border: `1px solid ${T.black}`,
            borderRadius: 999, padding: "6px 14px",
          }}>
            <span className={isActive ? "bz-pulse" : ""} style={{ width: 6, height: 6, borderRadius: 999, background: isActive ? "#fff" : T.black }} />
            {statusBadge.label}
          </span>
          <span style={{ fontFamily: MONO, fontSize: 11.5, color: T.faint }}>
            {fmt(totalLinked)} linked records · {ago(lastActivity ?? new Date().toISOString())}
          </span>
        </div>
      </header>

      {/* ============ STATUS ACTIONS ============ */}
      <div className="bz-fade-up" style={{ animationDelay: ".1s", marginBottom: 20 }}>
        <AccountStatusActions userId={user.id} status={user.account_status} />
      </div>

      {/* ============ ACCOUNT SNAPSHOT ============ */}
      <section style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 600, color: T.muted, fontFamily: MONO }}>
            At a glance
          </h2>
          <span style={{ fontFamily: MONO, fontSize: 11.5, color: T.faint }}>derived from current profile & contacts</span>
        </div>
        <div className="bz-grid-snap" style={{ display: "grid", gap: 10 }}>
          <SnapshotCard label="BINZEO ID" value={user.binzeo_user_id || "—"} delay={0.05} />
          <SnapshotCard label="Username" value={user.username ? `@${user.username}` : "—"} delay={0.08} />
          <SnapshotCard label="Primary email" value={primaryEmail || "—"} sub={verifiedContacts > 0 ? `${verifiedContacts} verified contact(s)` : "Not verified"} delay={0.11} />
          <SnapshotCard label="Phone" value={primaryPhone || "—"} delay={0.14} />
          <SnapshotCard label="Location" value={locationStr} sub={primaryAddr?.country_code ? String(primaryAddr.country_code) : undefined} delay={0.17} />
          <SnapshotCard label="Birthday" value={birthStr} sub={ageStr || undefined} delay={0.2} />
        </div>
      </section>

      {/* ============ SECURITY NOTE ============ */}
      <div className="bz-fade-up" style={{
        padding: "14px 18px", border: `1px solid ${T.line}`, borderRadius: 12, background: T.surface,
        marginBottom: 24, display: "flex", gap: 10, alignItems: "flex-start", animationDelay: ".22s",
      }}>
        <span style={{
          width: 20, height: 20, borderRadius: 6, background: T.black, color: "#fff",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 700, flexShrink: 0,
        }}>!</span>
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: T.muted }}>
          <strong style={{ color: T.black }}>Security note:</strong> raw passwords, OTP/code hashes, passkey keys and temporary token hashes are intentionally excluded. Their lifecycle, status, timestamps and audit metadata are shown where available.
        </p>
      </div>

      {/* ============ KPI STRIP ============ */}
      <section style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 600, color: T.muted, fontFamily: MONO }}>
            Account metrics · live
          </h2>
          <span style={{ fontFamily: MONO, fontSize: 11.5, color: T.faint }}>{fmt(totalLinked)} total linked records</span>
        </div>
        <div className="bz-grid-kpi" style={{ display: "grid", gap: 12 }}>
          {kpis.map((k, i) => (
            <KPICard key={k.label} index={i + 1} label={k.label} value={k.value} detail={k.detail} spark={k.spark} delay={0.05 * i} />
          ))}
        </div>
      </section>

      {/* ============ ROW 1: trend + risk ============ */}
      <section className="bz-grid-2" style={{ display: "grid", gap: 16, marginBottom: 16 }}>
        <Panel eyebrow="Trend · last 30 days" title="Login activity"
          delay={0.15}
          action={<span style={{ fontFamily: MONO, fontSize: 11, color: T.muted, border: `1px solid ${T.line}`, borderRadius: 999, padding: "4px 10px" }}>{fmt(logins.length)} events</span>}>
          {logins.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", fontSize: 12.5, color: T.muted, fontFamily: MONO }}>No login events yet</div>
          ) : (
            <AreaChart data={loginTrend} labels={dayLabels} height={220} />
          )}
        </Panel>

        <Panel eyebrow="Security posture" title="Trust assessment" delay={0.2}>
          <RiskBar score={score} level={riskLevel} />
          <ul style={{ listStyle: "none", padding: 0, margin: 0, marginTop: 6 }}>
            <InfoRow label="2FA" value={twoFactorEnabled ? "Enabled" : "Not enabled"} />
            <InfoRow label="Verified" value={`${verifiedCount} / ${verifications.length || 0}`} />
            <InfoRow label="Trusted devices" value={`${trustedDevices} / ${devices.length || 0}`} />
            <InfoRow label="Passkeys" value={passkeys.length} />
            <InfoRow label="Active lockouts" value={activeLockouts > 0 ? `${activeLockouts} active` : "None"} />
            <InfoRow label="Failed logins" value={`${loginFailed} of ${logins.length || 0}`} />
          </ul>
        </Panel>
      </section>

      {/* ============ ROW 2: distributions ============ */}
      <section className="bz-grid-3" style={{ display: "grid", gap: 16, marginBottom: 16 }}>
        <Panel eyebrow="Devices" title="Device mix" delay={0.25}>
          {deviceSegments.length === 0 ? (
            <div style={{ padding: 26, textAlign: "center", fontSize: 12, color: T.muted, fontFamily: MONO }}>No devices registered</div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
              <Donut segments={deviceSegments} size={150} centerLabel="DEVICES" />
              <div style={{ flex: 1, minWidth: 130, display: "flex", flexDirection: "column", gap: 9 }}>
                {deviceSegments.map((s, i) => (
                  <div key={s.label} className="bz-fade-up" style={{ display: "flex", alignItems: "center", gap: 8, animationDelay: `${0.3 + i * 0.05}s` }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: SHADES[i % SHADES.length], flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: T.ink, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</span>
                    <span style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 700, color: T.black }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>

        <Panel eyebrow="Sign-in" title="Auth methods" delay={0.3}>
          {authSegments.length === 0 ? (
            <div style={{ padding: 26, textAlign: "center", fontSize: 12, color: T.muted, fontFamily: MONO }}>No auth methods linked</div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
              <Donut segments={authSegments} size={150} centerLabel="METHODS" />
              <div style={{ flex: 1, minWidth: 130, display: "flex", flexDirection: "column", gap: 9 }}>
                {authSegments.map((s, i) => (
                  <div key={s.label} className="bz-fade-up" style={{ display: "flex", alignItems: "center", gap: 8, animationDelay: `${0.35 + i * 0.05}s` }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: SHADES[i % SHADES.length], flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: T.ink, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</span>
                    <span style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 700, color: T.black }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>

        <Panel eyebrow="Weekly rhythm" title="Events per day" delay={0.35}>
          {weekBars.every((v) => v === 0) ? (
            <div style={{ padding: 26, textAlign: "center", fontSize: 12, color: T.muted, fontFamily: MONO }}>No events this week</div>
          ) : (
            <WeekBars data={weekBars} labels={weekLabels} height={180} />
          )}
        </Panel>
      </section>

      {/* ============ ROW 3: heatmap + insights ============ */}
      <section className="bz-grid-2" style={{ display: "grid", gap: 16, marginBottom: 16 }}>
        <Panel eyebrow="Time-of-day pattern" title="Login distribution (24h)"
          delay={0.4}
          action={peakHour !== null ? (
            <span style={{ fontFamily: MONO, fontSize: 11, color: T.black, border: `1px solid ${T.black}`, borderRadius: 999, padding: "4px 10px", fontWeight: 600 }}>
              Peak {String(peakHour).padStart(2, "0")}:00
            </span>
          ) : undefined}>
          {logins.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", fontSize: 12.5, color: T.muted, fontFamily: MONO }}>No login data yet</div>
          ) : (
            <>
              <DayHeatmap cells={hourCells} />
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, fontSize: 10.5, color: T.muted, fontFamily: MONO }}>
                <span>LESS</span>
                {[0.08, 0.28, 0.5, 0.72, 0.95].map((o) => (
                  <span key={o} style={{ width: 12, height: 12, borderRadius: 2, background: `rgba(10,10,10,${o})`, display: "inline-block" }} />
                ))}
                <span>MORE</span>
              </div>
            </>
          )}
        </Panel>

        <Panel eyebrow="Auto-generated" title="Signals at a glance" delay={0.45}>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {insights.map((ins, i) => {
              const dot = ins.tone === "ok" ? T.black : ins.tone === "warn" ? T.gray700 : T.faint;
              return (
                <li key={ins.label} className="bz-fade-up" style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  gap: 10, padding: "10px 0",
                  borderBottom: i < insights.length - 1 ? `1px solid ${T.line}` : "none",
                  animationDelay: `${0.5 + i * 0.04}s`,
                }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: dot, flexShrink: 0 }} />
                    <span style={{ fontFamily: MONO, fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{ins.label}</span>
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 700, color: T.black }}>{ins.value}</span>
                </li>
              );
            })}
          </ul>
        </Panel>
      </section>

      {/* ============ LIVE FEED ============ */}
      <section style={{ marginBottom: 32 }}>
        <Panel eyebrow="Live feed" title="Recent events" delay={0.55}
          action={<span style={{ fontFamily: MONO, fontSize: 11, color: T.muted, border: `1px solid ${T.line}`, borderRadius: 999, padding: "4px 10px" }}>last {feed.length}</span>}>
          {feed.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", fontSize: 12.5, color: T.muted, fontFamily: MONO }}>No recent activity</div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {feed.map((e, i) => (
                <li key={i} className="bz-fade-up" style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
                  borderBottom: i < feed.length - 1 ? `1px solid ${T.line}` : "none",
                  animationDelay: `${0.6 + i * 0.04}s`,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: e.kind === "login" ? T.black : T.gray700, flexShrink: 0 }} />
                  <span style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: T.muted, minWidth: 54 }}>{e.kind}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11.5, color: T.ink, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.label || "—"}
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 10.5, color: T.faint, flexShrink: 0 }}>{ago(e.ts)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      {/* ============ SECTION NAVIGATOR ============ */}
      <section style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <div>
            <p style={{ margin: 0, fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: MONO }}>
              Linked data · complete picture
            </p>
            <h2 style={{ margin: "6px 0 4px", fontSize: "clamp(22px, 2.6vw, 28px)", fontWeight: 700, letterSpacing: "-0.03em", color: T.black }}>
              All records grouped by purpose
            </h2>
            <p style={{ margin: 0, fontSize: 13.5, color: T.muted }}>
              {grandSections} sections across {CATEGORIES.length} categories · {fmt(totalLinked)} rows attached to this account
            </p>
          </div>
          <span style={{ fontFamily: MONO, fontSize: 11.5, color: T.ink, border: `1px solid ${T.line}`, background: "#fff", borderRadius: 999, padding: "6px 12px" }}>
            {fmt(totalLinked)} rows · {grandSections} sections
          </span>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {CATEGORIES.map((c) => {
            const count = c.tables.reduce((s, t) => s + rowsFor(t).length, 0);
            return (
              <a key={c.id} href={`#cat-${c.id}`} className="bz-chip" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "7px 12px", border: `1px solid ${T.line}`, borderRadius: 999,
                background: "#fff", color: T.black, textDecoration: "none",
                fontFamily: MONO, fontSize: 11.5, fontWeight: 600,
              }}>
                <span style={{
                  width: 18, height: 18, borderRadius: 6, background: T.black, color: "#fff",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9.5, fontWeight: 700,
                }}>{c.letter}</span>
                <span>{c.title}</span>
                <span style={{ color: T.faint, fontWeight: 500 }}>· {count}</span>
              </a>
            );
          })}
        </div>
      </section>

      {/* ============ DATA SECTIONS BY CATEGORY ============ */}
      {totalLinked === 0 ? (
        <div className="bz-fade-up" style={{
          padding: "48px 24px", textAlign: "center", border: `1px dashed ${T.line}`,
          borderRadius: 16, background: T.surface, animationDelay: ".3s",
        }}>
          <p style={{ margin: 0, fontSize: 13.5, color: T.muted, fontFamily: MONO }}>
            No linked records yet. As this account becomes active, records will appear here grouped by purpose.
          </p>
        </div>
      ) : (
        CATEGORIES.map((cat) => {
          const catRows = cat.tables.reduce((s, t) => s + rowsFor(t).length, 0);
          let sectionCounter = 0;
          return (
            <section key={cat.id}>
              <CategoryHeader
                id={cat.id}
                letter={cat.letter}
                title={cat.title}
                purpose={cat.purpose}
                rows={catRows}
                tables={cat.tables.length}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {cat.tables.map((table) => {
                  sectionCounter += 1;
                  const sectionIndex = `${cat.letter}.${String(sectionCounter).padStart(2, "0")}`;
                  const meta = metaFor(table);
                  const data = rowsFor(table);
                  const displayTitle = table === "__profile__"
                    ? "Profile / all fields"
                    : (datasets[indexOfDataset(table)]?.[0] ?? table);
                  const columns = table === "__profile__"
                    ? profileFields
                    : [...((datasets[indexOfDataset(table)]?.[2] ?? []) as readonly string[])];
                  return (
                    <div key={table} className="bz-fade-up" style={{ animationDelay: `${0.05 * Math.min(sectionCounter, 10)}s` }}>
                      <SectionHeader
                        index={sectionIndex}
                        title={displayTitle}
                        count={data.length}
                        sensitive={meta.sensitive}
                        purpose={meta.purpose}
                      />
                      <UserDataSection
                        title={displayTitle}
                        description={undefined}
                        columns={columns}
                        rows={data}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })
      )}

      {/* ============ FOOTER ============ */}
      <footer style={{
        marginTop: 48, paddingTop: 20, borderTop: `1px solid ${T.line}`,
        display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "center",
        fontFamily: MONO, fontSize: 11, color: T.faint, letterSpacing: "0.04em",
      }}>
        <span>BINZEO ADMIN CONSOLE — USER DETAIL v3.0</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span className="bz-pulse" style={{ width: 6, height: 6, borderRadius: 999, background: T.black }} />
          LIVE · {fmt(totalLinked)} RECORDS · {grandSections} SECTIONS
        </span>
      </footer>
    </div>
  );
}
