import Link from "next/link";
import type { ReactNode } from "react";
import { getAdminDataClient, requireAdminPermission } from "@/lib/admin";
import ActiveUsers from "@/components/ActiveUsers";

/* ================= TOKENS ================= */
const T = {
  black: "#0A0A0A", ink: "#171717", gray700: "#404040", muted: "#737373",
  faint: "#A3A3A3", gray300: "#D4D4D4", line: "#E5E5E5", soft: "#F5F5F5",
  canvas: "#FAFAFA", surface: "#FFFFFF",
};
const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';
const SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif';
const SHADES = ["#0A0A0A", "#404040", "#737373", "#A3A3A3", "#D4D4D4", "#E5E5E5"];

type User = {
  id: string;
  binzeo_user_id?: string | null;
  display_name?: string | null;
  username?: string | null;
  profile_photo_url?: string | null;
  country_code?: string | null;
  preferred_language?: string | null;
  created_at?: string | null;
};

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
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

/* ================= ANIMATED CSS ================= */
const ANIM_CSS = `
  @keyframes bzDraw   { to { stroke-dashoffset: 0; } }
  @keyframes bzFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes bzPop    { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
  @keyframes bzGrowY  { from { transform: scaleY(0); } to { transform: scaleY(1); } }
  @keyframes bzRiseUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes bzGrowX  { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  @keyframes bzPulse  { 0%,100% { opacity: 1; } 50% { opacity: .28; } }

  .bz-line-path { stroke-dasharray: 2000; stroke-dashoffset: 2000; animation: bzDraw 1.5s cubic-bezier(.4,0,.2,1) forwards; }
  .bz-spark-line { stroke-dasharray: 500; stroke-dashoffset: 500; animation: bzDraw 1s cubic-bezier(.4,0,.2,1) forwards; }
  .bz-area-path { opacity: 0; animation: bzFadeIn .9s ease-out .45s forwards; }
  .bz-spark-area { opacity: 0; animation: bzFadeIn .7s ease-out .3s forwards; }
  .bz-point-dot { transform-box: fill-box; transform-origin: center; opacity: 0; animation: bzPop .35s ease-out forwards; }
  .bz-spark-dot { transform-box: fill-box; transform-origin: center; opacity: 0; animation: bzPop .35s ease-out 1s forwards; }
  .bz-bar-rect { transform-box: fill-box; transform-origin: bottom; transform: scaleY(0); animation: bzGrowY .8s cubic-bezier(.2,.7,.2,1) forwards; }
  .bz-hbar { transform-box: fill-box; transform-origin: left; transform: scaleX(0); animation: bzGrowX .9s cubic-bezier(.2,.7,.2,1) forwards; }
  .bz-donut-seg { opacity: 0; animation: bzFadeIn .8s ease-out forwards; }
  .bz-fade-up { opacity: 0; animation: bzRiseUp .55s cubic-bezier(.2,.7,.2,1) forwards; }
  .bz-number { display: inline-block; opacity: 0; animation: bzRiseUp .5s ease-out forwards; }
  .bz-pulse { animation: bzPulse 2.2s ease-in-out infinite; }
  .bz-card { transition: transform .22s cubic-bezier(.2,.7,.2,1), border-color .22s ease, box-shadow .22s ease; }
  .bz-card:hover { transform: translateY(-2px); border-color: ${T.black}; box-shadow: 0 14px 32px -22px rgba(0,0,0,.24); }
  .bz-chip { transition: background .18s ease, color .18s ease, border-color .18s ease; }
  .bz-chip:hover { background: ${T.black} !important; color: #fff !important; border-color: ${T.black} !important; }
  .bz-anchor { scroll-margin-top: 24px; }

  .bz-grid-kpi { grid-template-columns: repeat(6,1fr); }
  .bz-grid-2 { grid-template-columns: 1.6fr 1fr; }
  .bz-grid-3 { grid-template-columns: 1fr 1fr 1fr; }
  .bz-grid-dist { grid-template-columns: 1fr 1fr 1.2fr; }
  @media (max-width:1200px){
    .bz-grid-kpi{grid-template-columns:repeat(3,1fr)!important}
    .bz-grid-3{grid-template-columns:1fr 1fr!important}
    .bz-grid-dist{grid-template-columns:1fr 1fr!important}
  }
  @media (max-width:1100px){
    .bz-grid-kpi{grid-template-columns:repeat(2,1fr)!important}
    .bz-grid-2{grid-template-columns:1fr!important}
  }
  @media (max-width:640px){
    .bz-grid-kpi,.bz-grid-3,.bz-grid-dist{grid-template-columns:1fr!important}
  }
  @media (prefers-reduced-motion: reduce){
    .bz-line-path,.bz-spark-line,.bz-area-path,.bz-spark-area,.bz-point-dot,.bz-spark-dot,
    .bz-bar-rect,.bz-hbar,.bz-donut-seg,.bz-fade-up,.bz-number{
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

/* ================= CHART: Area (draw animation) ================= */
function AreaChart({ data, labels, height = 220 }: { data: number[]; labels: string[]; height?: number }) {
  const w = 720, h = height;
  const pad = { t: 22, r: 16, b: 30, l: 40 };
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const rawMax = Math.max(...data, 1);
  const niceMax = Math.max(3, Math.ceil(rawMax / 3) * 3);
  const step = data.length > 1 ? iw / (data.length - 1) : iw;
  const pts = data.map((v, i) => [pad.l + i * step, pad.t + ih - (v / niceMax) * ih] as const);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${pad.t + ih} L${pad.l},${pad.t + ih} Z`;
  const tickEvery = Math.max(1, Math.ceil(labels.length / 8));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height, display: "block" }}>
      <defs>
        <linearGradient id="bzDirArea" x1="0" y1="0" x2="0" y2="1">
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
      <path d={area} fill="url(#bzDirArea)" className="bz-area-path" />
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
function Donut({ segments, size = 170, centerLabel = "TOTAL", centerValue }: {
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

/* ================= HORIZONTAL BARS ================= */
function HBars({ segments, height = 240 }: {
  segments: { label: string; value: number; sub?: string }[]; height?: number;
}) {
  const max = Math.max(...segments.map((s) => s.value), 1);
  const rowH = 32;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: height / 6 }}>
      {segments.map((s, i) => {
        const pct = (s.value / max) * 100;
        return (
          <div key={s.label} className="bz-fade-up" style={{ animationDelay: `${0.1 + i * 0.05}s` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
              <span style={{ fontSize: 12, color: T.ink, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {s.label}
              </span>
              <span style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 700, color: T.black, flexShrink: 0 }}>
                {s.sub ? `${s.sub} · ` : ""}{fmt(s.value)}
              </span>
            </div>
            <div style={{ height: 6, background: T.soft, borderRadius: 999, overflow: "hidden" }}>
              <div style={{
                width: `${pct}%`, height: "100%",
                background: SHADES[i % SHADES.length],
                transformOrigin: "left", transform: "scaleX(0)",
                animation: `bzGrowX .9s cubic-bezier(.2,.7,.2,1) ${0.15 + i * 0.06}s forwards`,
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ================= CHART: Week Bars ================= */
function WeekBars({ data, labels, height = 200 }: { data: number[]; labels: string[]; height?: number }) {
  const w = 480, h = height;
  const pad = { t: 22, r: 12, b: 28, l: 28 };
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const max = Math.max(...data, 1);
  const slot = iw / Math.max(data.length, 1);
  const bw = Math.min(slot * 0.55, 34);
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

function KPICard({ label, value, detail, spark, index, delay = 0 }: {
  label: string; value: number | string; detail: string; spark?: number[]; index: number; delay?: number;
}) {
  return (
    <div className="bz-fade-up" style={{
      background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14,
      padding: "16px 18px 14px", display: "flex", flexDirection: "column", gap: 12,
      minHeight: 148, minWidth: 0, animationDelay: `${delay}s`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: MONO }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 10, color: T.faint, border: `1px solid ${T.line}`, borderRadius: 999, padding: "2px 6px" }}>
          {String(index).padStart(2, "0")}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}>
        <div className="bz-number" style={{ fontSize: 32, lineHeight: 1, fontWeight: 700, letterSpacing: "-0.035em", color: T.black, fontVariantNumeric: "tabular-nums", animationDelay: `${delay + 0.1}s` }}>
          {typeof value === "number" ? fmt(value) : value}
        </div>
        {spark && spark.length >= 2 && <Sparkline data={spark} w={80} h={26} />}
      </div>
      <div style={{ marginTop: "auto", paddingTop: 10, borderTop: `1px solid ${T.line}`, display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: T.muted }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: T.black, flexShrink: 0 }} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{detail}</span>
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

function InsightRow({ label, value, tone = "ok" }: { label: string; value: string; tone?: "ok" | "warn" | "bad" }) {
  const dot = tone === "ok" ? T.black : tone === "warn" ? T.gray700 : T.faint;
  return (
    <li style={{
      display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
      padding: "10px 0", borderBottom: `1px solid ${T.line}`,
    }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: dot, flexShrink: 0 }} />
        <span style={{ fontFamily: MONO, fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      </span>
      <span style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 700, color: T.black }}>{value}</span>
    </li>
  );
}

/* ================= PAGE ================= */
export default async function UsersPage() {
  const context = await requireAdminPermission("users.read");
  const db = await getAdminDataClient(context.access);
  const { data, error } = await db
    .from("profiles")
    .select("id,binzeo_user_id,display_name,username,profile_photo_url,country_code,preferred_language,created_at")
    .eq("account_status", "active")
    .order("created_at", { ascending: false })
    .limit(500);

  const users = (data ?? []) as User[];

  /* -------- overview stats (all real) -------- */
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

  const newThisWeek = users.filter((u) => {
    if (!u.created_at) return false;
    return new Date(u.created_at).getTime() >= sevenDaysAgo.getTime();
  }).length;
  const newThisMonth = users.filter((u) => {
    if (!u.created_at) return false;
    return new Date(u.created_at).getTime() >= thirtyDaysAgo.getTime();
  }).length;

  /* -------- 30-day signup trend -------- */
  const dayKeys: string[] = [];
  const dayLabels: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    dayKeys.push(localKey(d));
    dayLabels.push(d.toLocaleDateString("en-US", { weekday: "short" }));
  }
  const perDay = new Map<string, number>();
  users.forEach((u) => {
    if (!u.created_at) return;
    const k = localKey(new Date(u.created_at));
    perDay.set(k, (perDay.get(k) ?? 0) + 1);
  });
  const signupTrend = dayKeys.map((k) => perDay.get(k) ?? 0);

  /* -------- 7-day bars -------- */
  const weekKeys: string[] = [];
  const weekLabels: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    weekKeys.push(localKey(d));
    weekLabels.push(d.toLocaleDateString("en-US", { weekday: "short" }));
  }
  const weekBars = weekKeys.map((k) => perDay.get(k) ?? 0);

  /* -------- country distribution -------- */
  const countryMap = new Map<string, number>();
  users.forEach((u) => {
    const k = (u.country_code ?? "").trim().toUpperCase() || "UNKNOWN";
    countryMap.set(k, (countryMap.get(k) ?? 0) + 1);
  });
  const countrySegments = Array.from(countryMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  const topCountries = countrySegments.slice(0, 5);
  const otherCountriesCount = countrySegments.slice(5).reduce((s, c) => s + c.value, 0);
  const donutCountrySegments = otherCountriesCount > 0
    ? [...countrySegments.slice(0, 4), { label: "Other", value: otherCountriesCount }]
    : countrySegments.slice(0, 5);

  /* -------- language distribution -------- */
  const langMap = new Map<string, number>();
  users.forEach((u) => {
    const k = (u.preferred_language ?? "").trim().toLowerCase() || "unknown";
    langMap.set(k, (langMap.get(k) ?? 0) + 1);
  });
  const langSegments = Array.from(langMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  const otherLangsCount = langSegments.slice(4).reduce((s, c) => s + c.value, 0);
  const donutLangSegments = otherLangsCount > 0
    ? [...langSegments.slice(0, 3), { label: "Other", value: otherLangsCount }]
    : langSegments.slice(0, 4);

  /* -------- derived insights -------- */
  const withPhoto = users.filter((u) => u.profile_photo_url).length;
  const withUsername = users.filter((u) => u.username).length;
  const withBinzeoId = users.filter((u) => u.binzeo_user_id).length;
  const avgPerDay30 = Math.round((newThisMonth / 30) * 10) / 10;
  const busiestIdx = weekBars.indexOf(Math.max(...weekBars));

  /* -------- newest users -------- */
  const newest = [...users]
    .filter((u) => u.created_at)
    .sort((a, b) => +new Date(b.created_at!) - +new Date(a.created_at!))
    .slice(0, 6);

  /* -------- KPI values (real) -------- */
  const kpis = [
    { label: "Total active", value: users.length, detail: "Loaded from directory", spark: signupTrend },
    { label: "New this week", value: newThisWeek, detail: "Joined in last 7 days", spark: weekBars },
    { label: "New this month", value: newThisMonth, detail: "Joined in last 30 days", spark: undefined },
    { label: "Countries", value: countrySegments.length, detail: topCountries[0] ? `Top: ${topCountries[0].label}` : "No country data", spark: undefined },
    { label: "Languages", value: langSegments.length, detail: langSegments[0] ? `Top: ${langSegments[0].label}` : "No language data", spark: undefined },
    { label: "Avg / day", value: avgPerDay30, detail: "30-day signup rate", spark: undefined },
  ];

  /* -------- insights -------- */
  const insights: { label: string; value: string; tone: "ok" | "warn" | "bad" }[] = [
    { label: "Profiles with photo", value: `${withPhoto} / ${users.length}`, tone: withPhoto / Math.max(users.length, 1) > 0.6 ? "ok" : "warn" },
    { label: "With username", value: `${withUsername} / ${users.length}`, tone: withUsername / Math.max(users.length, 1) > 0.6 ? "ok" : "warn" },
    { label: "With BINZEO ID", value: `${withBinzeoId} / ${users.length}`, tone: withBinzeoId === users.length ? "ok" : withBinzeoId / Math.max(users.length, 1) > 0.8 ? "warn" : "bad" },
    { label: "Busiest day", value: weekBars[busiestIdx] > 0 ? weekLabels[busiestIdx] : "—", tone: "ok" },
    { label: "Avg per day (30d)", value: `${avgPerDay30}`, tone: "ok" },
  ];

  return (
    <div style={{ background: T.canvas, minHeight: "100%", padding: "32px clamp(20px, 4vw, 48px) 80px", color: T.ink, fontFamily: SANS }}>
      <style>{ANIM_CSS}</style>

      {/* ============ BREADCRUMB ============ */}
      <nav style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontFamily: MONO, fontSize: 11.5, color: T.muted }}>
        <Link href="/dashboard" style={{ color: T.muted, textDecoration: "none" }}>Control room</Link>
        <span style={{ color: T.faint }}>/</span>
        <span style={{ color: T.black, fontWeight: 600 }}>Active users</span>
      </nav>

      {/* ============ HERO ============ */}
      <header className="bz-fade-up" style={{
        display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "space-between", alignItems: "flex-start",
        padding: 24, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, marginBottom: 20,
        animationDelay: ".05s",
      }}>
        <div style={{ maxWidth: 720, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{
              width: 26, height: 26, borderRadius: 8, background: T.black, color: "#fff",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700,
            }}>B</span>
            <span style={{ fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: MONO }}>
              Directory · Active profiles
            </span>
          </div>
          <h1 style={{ margin: "0 0 10px", fontSize: "clamp(26px, 3.2vw, 38px)", lineHeight: 1.05, fontWeight: 700, letterSpacing: "-0.035em", color: T.black }}>
            Active users
          </h1>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: T.muted, maxWidth: 620 }}>
            Browse the live directory of active user profiles — organised by growth, geography and language, with every account openable for full detail.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11.5, fontWeight: 700,
            fontFamily: MONO, letterSpacing: "0.08em", textTransform: "uppercase",
            color: "#fff", background: T.black, border: `1px solid ${T.black}`,
            borderRadius: 999, padding: "6px 14px",
          }}>
            <span className="bz-pulse" style={{ width: 6, height: 6, borderRadius: 999, background: "#fff" }} />
            Live directory
          </span>
          <span style={{ fontFamily: MONO, fontSize: 11.5, color: T.faint }}>
            {fmt(users.length)} active · capped at 500
          </span>
        </div>
      </header>

      {error ? (
        <div style={{
          padding: "14px 18px", border: `1px solid ${T.line}`, borderRadius: 12,
          background: T.surface, marginBottom: 24, fontFamily: MONO, fontSize: 12.5, color: T.black,
        }}>
          <strong>Error:</strong> {error.message}
        </div>
      ) : null}

      {/* ============ KPI STRIP ============ */}
      <section style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 600, color: T.muted, fontFamily: MONO }}>
            Directory metrics · live
          </h2>
          <span style={{ fontFamily: MONO, fontSize: 11.5, color: T.faint }}>computed from current active profiles</span>
        </div>
        <div className="bz-grid-kpi" style={{ display: "grid", gap: 12 }}>
          {kpis.map((k, i) => (
            <KPICard key={k.label} index={i + 1} label={k.label} value={k.value} detail={k.detail} spark={k.spark} delay={0.05 * i} />
          ))}
        </div>
      </section>

      {/* ============ ROW 1: trend + week ============ */}
      <section className="bz-grid-2" style={{ display: "grid", gap: 16, marginBottom: 16 }}>
        <Panel eyebrow="Trend · last 30 days" title="New active users per day"
          delay={0.15}
          action={<span style={{ fontFamily: MONO, fontSize: 11, color: T.muted, border: `1px solid ${T.line}`, borderRadius: 999, padding: "4px 10px" }}>{fmt(newThisMonth)} new / 30d</span>}>
          {users.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", fontSize: 12.5, color: T.muted, fontFamily: MONO }}>No active users yet</div>
          ) : (
            <AreaChart data={signupTrend} labels={dayLabels} height={220} />
          )}
        </Panel>

        <Panel eyebrow="Weekly rhythm" title="New users per day"
          delay={0.2}
          action={<span style={{ fontFamily: MONO, fontSize: 11, color: T.muted, border: `1px solid ${T.line}`, borderRadius: 999, padding: "4px 10px" }}>{fmt(newThisWeek)} this week</span>}>
          {weekBars.every((v) => v === 0) ? (
            <div style={{ padding: 40, textAlign: "center", fontSize: 12.5, color: T.muted, fontFamily: MONO }}>No new users this week</div>
          ) : (
            <WeekBars data={weekBars} labels={weekLabels} height={220} />
          )}
        </Panel>
      </section>

      {/* ============ ROW 2: distributions ============ */}
      <section className="bz-grid-dist" style={{ display: "grid", gap: 16, marginBottom: 16 }}>
        <Panel eyebrow="Geography" title="Country mix" delay={0.25}>
          {countrySegments.length === 0 ? (
            <div style={{ padding: 26, textAlign: "center", fontSize: 12, color: T.muted, fontFamily: MONO }}>No country data</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <Donut segments={donutCountrySegments} size={170} centerLabel="COUNTRIES" centerValue={countrySegments.length} />
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                {donutCountrySegments.map((s, i) => (
                  <div key={s.label} className="bz-fade-up" style={{ display: "flex", alignItems: "center", gap: 8, animationDelay: `${0.3 + i * 0.05}s` }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: SHADES[i % SHADES.length], flexShrink: 0 }} />
                    <span style={{ fontFamily: MONO, fontSize: 11.5, color: T.ink, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</span>
                    <span style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 700, color: T.black }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>

        <Panel eyebrow="Language" title="Language mix" delay={0.3}>
          {langSegments.length === 0 ? (
            <div style={{ padding: 26, textAlign: "center", fontSize: 12, color: T.muted, fontFamily: MONO }}>No language data</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <Donut segments={donutLangSegments} size={170} centerLabel="LANGUAGES" centerValue={langSegments.length} />
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                {donutLangSegments.map((s, i) => (
                  <div key={s.label} className="bz-fade-up" style={{ display: "flex", alignItems: "center", gap: 8, animationDelay: `${0.35 + i * 0.05}s` }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: SHADES[i % SHADES.length], flexShrink: 0 }} />
                    <span style={{ fontFamily: MONO, fontSize: 11.5, color: T.ink, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textTransform: "uppercase" }}>{s.label}</span>
                    <span style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 700, color: T.black }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>

        <Panel eyebrow="Leaderboard" title="Top countries" delay={0.35}
          action={<span style={{ fontFamily: MONO, fontSize: 11, color: T.muted, border: `1px solid ${T.line}`, borderRadius: 999, padding: "4px 10px" }}>{countrySegments.length} total</span>}>
          {topCountries.length === 0 ? (
            <div style={{ padding: 26, textAlign: "center", fontSize: 12, color: T.muted, fontFamily: MONO }}>No country data</div>
          ) : (
            <HBars segments={topCountries.map((c) => ({
              label: c.label,
              value: c.value,
              sub: `${Math.round((c.value / Math.max(users.length, 1)) * 100)}%`,
            }))} height={240} />
          )}
        </Panel>
      </section>

      {/* ============ ROW 3: insights + newest ============ */}
      <section className="bz-grid-2" style={{ display: "grid", gap: 16, marginBottom: 24 }}>
        <Panel eyebrow="Newest accounts" title="Recently joined"
          delay={0.4}
          action={<span style={{ fontFamily: MONO, fontSize: 11, color: T.muted, border: `1px solid ${T.line}`, borderRadius: 999, padding: "4px 10px" }}>last {newest.length}</span>}>
          {newest.length === 0 ? (
            <div style={{ padding: 26, textAlign: "center", fontSize: 12.5, color: T.muted, fontFamily: MONO }}>No recent signups</div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {newest.map((u, i) => {
                const name = u.display_name || u.binzeo_user_id || u.username || "Unnamed";
                return (
                  <li key={u.id} className="bz-fade-up" style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
                    borderBottom: i < newest.length - 1 ? `1px solid ${T.line}` : "none",
                    animationDelay: `${0.45 + i * 0.05}s`,
                  }}>
                    {u.profile_photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.profile_photo_url} alt=""
                        style={{ width: 32, height: 32, borderRadius: 10, objectFit: "cover", flexShrink: 0, border: `1px solid ${T.line}` }} />
                    ) : (
                      <span style={{
                        width: 32, height: 32, borderRadius: 10, background: T.black, color: "#fff",
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 700, flexShrink: 0,
                      }}>{name.slice(0, 1).toUpperCase()}</span>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link href={`/dashboard/users/${u.id}`} style={{
                        fontSize: 12.5, fontWeight: 600, color: T.black, textDecoration: "none",
                        display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {name}
                      </Link>
                      <span style={{ fontFamily: MONO, fontSize: 10.5, color: T.faint }}>
                        {u.country_code ? String(u.country_code).toUpperCase() : "—"}
                        {u.preferred_language ? ` · ${String(u.preferred_language).toLowerCase()}` : ""}
                      </span>
                    </div>
                    <span style={{ fontFamily: MONO, fontSize: 10.5, color: T.faint, flexShrink: 0 }}>
                      {u.created_at ? ago(u.created_at) : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel eyebrow="Auto-generated" title="Directory signals" delay={0.45}>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {insights.map((ins, i) => (
              <div key={ins.label} className="bz-fade-up" style={{ animationDelay: `${0.5 + i * 0.04}s` }}>
                <InsightRow label={ins.label} value={ins.value} tone={ins.tone} />
              </div>
            ))}
          </ul>
          <div style={{
            marginTop: 14, padding: "12px 14px", border: `1px solid ${T.line}`,
            borderRadius: 12, background: T.canvas,
          }}>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: T.muted }}>
              <strong style={{ color: T.black }}>Note:</strong> metrics reflect only active profiles currently loaded (max 500). Older or inactive accounts are excluded by design of this directory.
            </p>
          </div>
        </Panel>
      </section>

      {/* ============ USER GRID (existing component) ============ */}
      <section className="bz-anchor" style={{ marginTop: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <div>
            <p style={{ margin: 0, fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: MONO }}>
              Full directory
            </p>
            <h2 style={{ margin: "6px 0 4px", fontSize: "clamp(22px, 2.6vw, 28px)", fontWeight: 700, letterSpacing: "-0.03em", color: T.black }}>
              Browse every active user
            </h2>
            <p style={{ margin: 0, fontSize: 13.5, color: T.muted }}>
              Search, filter and open any profile for the complete account view.
            </p>
          </div>
          <span style={{ fontFamily: MONO, fontSize: 11.5, color: T.ink, border: `1px solid ${T.line}`, background: "#fff", borderRadius: 999, padding: "6px 12px" }}>
            {fmt(users.length)} active {users.length === 1 ? "user" : "users"}
          </span>
        </div>

        <div className="bz-fade-up" style={{
          background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16, padding: 20,
          animationDelay: ".5s",
        }}>
          <ActiveUsers users={users} />
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer style={{
        marginTop: 48, paddingTop: 20, borderTop: `1px solid ${T.line}`,
        display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "center",
        fontFamily: MONO, fontSize: 11, color: T.faint, letterSpacing: "0.04em",
      }}>
        <span>BINZEO ADMIN CONSOLE — ACTIVE USERS v2.0</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span className="bz-pulse" style={{ width: 6, height: 6, borderRadius: 999, background: T.black }} />
          LIVE · {fmt(users.length)} ACTIVE · {countrySegments.length} COUNTRIES · {langSegments.length} LANGUAGES
        </span>
      </footer>
    </div>
  );
}
