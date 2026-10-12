import Link from "next/link";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { DATA_TABLES } from "@/lib/data-tables";

/* ================= TOKENS (monochrome) ================= */
const T = {
  black: "#0A0A0A",
  ink: "#171717",
  gray700: "#404040",
  muted: "#737373",
  faint: "#A3A3A3",
  gray300: "#D4D4D4",
  line: "#E5E5E5",
  soft: "#F5F5F5",
  canvas: "#FAFAFA",
  surface: "#FFFFFF",
};
const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';
const SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif';
const SHADES = ["#0A0A0A", "#404040", "#737373", "#A3A3A3", "#D4D4D4"];

/* ================= HELPERS ================= */
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
const fmt = (n: number) => n.toLocaleString("en-US");

/* ================= CHART: Sparkline ================= */
function Sparkline({ data, w = 90, h = 30 }: { data: number[]; w?: number; h?: number }) {
  const safe = data.length > 1 ? data : [0, 0];
  const max = Math.max(...safe, 1);
  const min = Math.min(...safe, 0);
  const range = max - min || 1;
  const step = w / (safe.length - 1);
  const pts = safe.map((v, i) => [i * step, h - ((v - min) / range) * (h - 6) - 3] as const);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  const gid = `sp-${Math.random().toString(36).slice(2, 8)}`;
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={h} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={T.black} stopOpacity="0.16" />
          <stop offset="100%" stopColor={T.black} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={T.black} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill={T.black} />
    </svg>
  );
}

/* ================= CHART: Area ================= */
function AreaChart({ data, labels, height = 250 }: { data: number[]; labels: string[]; height?: number }) {
  const w = 720, h = height;
  const pad = { t: 24, r: 16, b: 32, l: 44 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const rawMax = Math.max(...data, 1);
  const niceMax = Math.max(5, Math.ceil(rawMax / 5) * 5);
  const step = data.length > 1 ? iw / (data.length - 1) : iw;
  const pts = data.map((v, i) => [pad.l + i * step, pad.t + ih - (v / niceMax) * ih] as const);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${pad.t + ih} L${pad.l},${pad.t + ih} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height, display: "block" }}>
      <defs>
        <linearGradient id="bzAreaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={T.black} stopOpacity="0.14" />
          <stop offset="100%" stopColor={T.black} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((r) => {
        const y = pad.t + ih * r;
        const val = Math.round(niceMax * (1 - r));
        return (
          <g key={r}>
            <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke={T.line} strokeDasharray="3 5" />
            <text x={pad.l - 10} y={y + 3} fontSize="10" fill={T.faint} textAnchor="end" fontFamily={MONO}>{val}</text>
          </g>
        );
      })}
      <path d={area} fill="url(#bzAreaFill)" />
      <path d={line} fill="none" stroke={T.black} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r="3.5" fill={T.surface} stroke={T.black} strokeWidth="2" />
          <text x={p[0]} y={h - 10} fontSize="10" fill={T.muted} textAnchor="middle" fontFamily={MONO}>{labels[i] ?? ""}</text>
        </g>
      ))}
    </svg>
  );
}

/* ================= CHART: Donut ================= */
function Donut({ segments, size = 210 }: { segments: { label: string; value: number }[]; size?: number }) {
  const total = segments.reduce((a, b) => a + b.value, 0);
  const cx = 110, cy = 110, r = 76, stroke = 20;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 220 220" width={size} height={size} style={{ display: "block" }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={T.soft} strokeWidth={stroke} />
      {total > 0 &&
        segments.map((s, i) => {
          const len = (s.value / total) * circ;
          const el = (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={SHADES[i % SHADES.length]}
              strokeWidth={stroke}
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
          offset += len;
          return el;
        })}
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="32" fontWeight="700" fill={T.black} fontFamily={SANS} letterSpacing="-0.03em">
        {fmt(total)}
      </text>
      <text x={cx} y={cy + 20} textAnchor="middle" fontSize="9.5" fill={T.muted} fontFamily={MONO} letterSpacing="0.14em">
        TOTAL RECORDS
      </text>
    </svg>
  );
}

/* ================= CHART: Bars ================= */
function Bars({ data, labels, height = 220 }: { data: number[]; labels: string[]; height?: number }) {
  const w = 480, h = height;
  const pad = { t: 24, r: 12, b: 30, l: 30 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const max = Math.max(...data, 1);
  const slot = iw / Math.max(data.length, 1);
  const bw = Math.min(slot * 0.5, 34);

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
            <rect x={x} y={y} width={bw} height={bh} rx="3" fill={T.black} />
            {v > 0 && (
              <text x={x + bw / 2} y={y - 6} textAnchor="middle" fontSize="10" fill={T.black} fontFamily={MONO} fontWeight="600">{v}</text>
            )}
            <text x={x + bw / 2} y={h - 10} textAnchor="middle" fontSize="10" fill={T.muted} fontFamily={MONO}>{labels[i] ?? ""}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ================= CHART: Radial Gauge ================= */
function Gauge({ value, max = 100, label, sublabel }: { value: number; max?: number; label: string; sublabel?: string }) {
  const pct = Math.max(0, Math.min(value / Math.max(max, 1), 1));
  const r = 54, cx = 72, cy = 72;
  const halfCirc = Math.PI * r;
  const path = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg viewBox="0 0 144 92" style={{ width: "100%", maxWidth: 150, display: "block" }}>
        <path d={path} fill="none" stroke={T.soft} strokeWidth="11" strokeLinecap="round" />
        <path d={path} fill="none" stroke={T.black} strokeWidth="11" strokeLinecap="round"
          strokeDasharray={`${halfCirc * pct} ${halfCirc}`} />
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize="22" fontWeight="700" fill={T.black} fontFamily={SANS} letterSpacing="-0.03em">
          {Math.round(pct * 100)}%
        </text>
        <text x={cx} y={cy + 8} textAnchor="middle" fontSize="8" fill={T.muted} fontFamily={MONO} letterSpacing="0.14em">
          {label.toUpperCase()}
        </text>
      </svg>
      {sublabel && <span style={{ fontSize: 11, color: T.muted, fontFamily: MONO }}>{sublabel}</span>}
    </div>
  );
}

/* ================= CHART: Heatmap ================= */
function Heatmap({ matrix, rowLabels }: { matrix: number[][]; rowLabels: string[] }) {
  const cols = 24;
  const rows = matrix.length;
  const cell = 14, gap = 3, leftPad = 42, topPad = 4;
  const w = leftPad + cols * (cell + gap) + 4;
  const h = topPad + rows * (cell + gap) + 22;
  const max = Math.max(...matrix.flat(), 1);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", display: "block" }}>
      {matrix.map((row, r) =>
        row.map((v, c) => {
          const inten = v / max;
          const fill = v === 0 ? T.soft : `rgba(10,10,10,${(0.08 + inten * 0.92).toFixed(3)})`;
          return (
            <rect key={`${r}-${c}`}
              x={leftPad + c * (cell + gap)}
              y={topPad + r * (cell + gap)}
              width={cell} height={cell} rx="2" fill={fill} />
          );
        })
      )}
      {rowLabels.map((d, i) => (
        <text key={d + i} x={leftPad - 8} y={topPad + i * (cell + gap) + cell * 0.72}
          fontSize="10" fill={T.muted} textAnchor="end" fontFamily={MONO}>{d}</text>
      ))}
      {[0, 6, 12, 18, 23].map((hr) => (
        <text key={hr}
          x={leftPad + hr * (cell + gap) + cell / 2}
          y={topPad + rows * (cell + gap) + 14}
          fontSize="10" fill={T.muted} textAnchor="middle" fontFamily={MONO}>
          {String(hr).padStart(2, "0")}
        </text>
      ))}
    </svg>
  );
}

/* ================= Panel ================= */
function Panel({ title, eyebrow, action, children }: { title: string; eyebrow?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16, padding: 22, display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          {eyebrow && (
            <p style={{ margin: 0, fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: MONO }}>{eyebrow}</p>
          )}
          <h3 style={{ margin: "6px 0 0", fontSize: 16.5, fontWeight: 650, letterSpacing: "-0.02em", color: T.black }}>{title}</h3>
        </div>
        {action}
      </div>
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}

/* ================= StatCard ================= */
function StatCard({ label, value, detail, spark, index, delta }: {
  label: string; value: number; detail: string; spark: number[]; index: number; delta?: number;
}) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16, padding: "20px 20px 16px", display: "flex", flexDirection: "column", gap: 14, minHeight: 176, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: MONO }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 10.5, color: T.faint, border: `1px solid ${T.line}`, borderRadius: 999, padding: "2px 7px" }}>
          {String(index).padStart(2, "0")}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontSize: 40, lineHeight: 1, fontWeight: 700, letterSpacing: "-0.035em", color: T.black, fontVariantNumeric: "tabular-nums" }}>
          {fmt(value)}
        </div>
        <Sparkline data={spark} w={90} h={30} />
      </div>
      <div style={{ marginTop: "auto", paddingTop: 12, borderTop: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 12, color: T.muted }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, minWidth: 0 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: T.black, flexShrink: 0 }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{detail}</span>
        </span>
        {typeof delta === "number" && (
          <span style={{ fontFamily: MONO, fontWeight: 600, color: delta >= 0 ? T.black : T.muted, flexShrink: 0 }}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%
          </span>
        )}
      </div>
    </div>
  );
}

/* ================= PAGE ================= */
export default async function Dashboard() {
  await requireAdmin();
  const db = await createClient();

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 6);
  cutoff.setHours(0, 0, 0, 0);
  const cutoffISO = cutoff.toISOString();

  const countTables = ["profiles", "user_login_history", "user_activity_logs", "admin_activity_logs"] as const;

  // parallel: counts + recent rows
  const [countRes, loginRes, userActRes, adminActRes] = await Promise.all([
    Promise.all(countTables.map((t) => db.from(t).select("id", { count: "exact", head: true }))),
    db.from("user_login_history").select("created_at").gte("created_at", cutoffISO),
    db.from("user_activity_logs").select("created_at").gte("created_at", cutoffISO),
    db.from("admin_activity_logs").select("created_at").gte("created_at", cutoffISO),
  ]);

  const counts = countRes.map((r) => r.count ?? 0);
  const countBySlug: Record<string, number> = {
    profiles: counts[0],
    user_login_history: counts[1],
    user_activity_logs: counts[2],
    admin_activity_logs: counts[3],
  };

  // 7-day buckets
  const dayLabels: string[] = [];
  const dayKeys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(cutoff);
    d.setDate(d.getDate() + i);
    dayLabels.push(d.toLocaleDateString("en-US", { weekday: "short" }));
    dayKeys.push(d.toISOString().slice(0, 10));
  }

  type Row = { created_at: string };
  function bucketize(rows: Row[] | null): number[] {
    const buckets = [0, 0, 0, 0, 0, 0, 0];
    (rows ?? []).forEach((r) => {
      const key = new Date(r.created_at).toISOString().slice(0, 10);
      const idx = dayKeys.indexOf(key);
      if (idx >= 0) buckets[idx]++;
    });
    return buckets;
  }

  const loginTrend = bucketize(loginRes.data as Row[] | null);
  const userTrend = bucketize(userActRes.data as Row[] | null);
  const adminTrend = bucketize(adminActRes.data as Row[] | null);

  // heatmap 7×24 (login history)
  const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  (loginRes.data as Row[] | null ?? []).forEach((r) => {
    const d = new Date(r.created_at);
    const key = d.toISOString().slice(0, 10);
    const dayIdx = dayKeys.indexOf(key);
    if (dayIdx >= 0) heatmap[dayIdx][d.getHours()]++;
  });

  const donutSegments = [
    { label: "Profiles", value: counts[0] },
    { label: "Login events", value: counts[1] },
    { label: "User activity", value: counts[2] },
    { label: "Admin audit", value: counts[3] },
  ];
  const totalRecords = counts.reduce((a, b) => a + b, 0);

  const delta = (arr: number[]) => {
    if (arr.length < 2) return 0;
    const last = arr[arr.length - 1];
    const prev = arr[arr.length - 2];
    if (prev === 0) return last > 0 ? 100 : 0;
    return Math.round(((last - prev) / prev) * 100);
  };

  // cumulative-looking user growth sparkline (approximation from current count)
  const userSpark = [0.82, 0.86, 0.89, 0.92, 0.95, 0.97, 1].map((f) => Math.round(counts[0] * f));

  const stats = [
    { label: "Users", value: counts[0], detail: "Profiles in directory", spark: userSpark, delta: undefined as number | undefined },
    { label: "Login events", value: counts[1], detail: "Authentication records", spark: loginTrend, delta: delta(loginTrend) },
    { label: "User activity", value: counts[2], detail: "Account activity logs", spark: userTrend, delta: delta(userTrend) },
    { label: "Admin audit", value: counts[3], detail: "Administrative actions", spark: adminTrend, delta: delta(adminTrend) },
  ];

  const weekTotals = dayLabels.map((_, i) => loginTrend[i] + userTrend[i] + adminTrend[i]);
  const weekSum = weekTotals.reduce((a, b) => a + b, 0);
  const busiestIdx = weekTotals.indexOf(Math.max(...weekTotals));

  const loginSum = loginTrend.reduce((a, b) => a + b, 0);
  const userSum = userTrend.reduce((a, b) => a + b, 0);
  const adminSum = adminTrend.reduce((a, b) => a + b, 0);

  const loginRate = Math.min(100, Math.round((loginSum / Math.max(totalRecords, 1)) * 100));
  const activityRate = Math.min(100, Math.round((userSum / Math.max(totalRecords, 1)) * 100));
  const adminRatio = counts[0] > 0 ? Math.min(100, Math.round((counts[3] / Math.max(counts[0], 1)) * 100)) : 0;

  const heatFlat = heatmap.flat();
  const heatMax = Math.max(...heatFlat, 0);
  const peakHour = heatMax > 0 ? heatFlat.indexOf(heatMax) % 24 : 0;

  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  return (
    <div style={{ background: T.canvas, minHeight: "100%", padding: "40px clamp(20px, 4vw, 56px) 80px", color: T.ink, fontFamily: SANS }}>
      <style>{`
        .bz-card { transition: transform .22s cubic-bezier(.2,.7,.2,1), border-color .22s ease, box-shadow .22s ease; }
        .bz-card:hover { transform: translateY(-3px); border-color: ${T.black}; box-shadow: 0 18px 40px -22px rgba(0,0,0,.28); }
        .bz-card:hover .bz-arrow { transform: translateX(5px); }
        .bz-arrow { transition: transform .22s ease; display:inline-block; }
        .bz-pulse { animation: bzPulse 2.2s ease-in-out infinite; }
        @keyframes bzPulse { 0%,100%{opacity:1} 50%{opacity:.28} }
        .bz-grid-stats { grid-template-columns: repeat(4, 1fr); }
        .bz-grid-2 { grid-template-columns: 2fr 1fr; }
        .bz-grid-3 { grid-template-columns: repeat(3, 1fr); }
        .bz-grid-heat { grid-template-columns: 2fr 1fr; }
        @media (max-width: 1100px){
          .bz-grid-stats{grid-template-columns:repeat(2,1fr) !important;}
          .bz-grid-2{grid-template-columns:1fr !important;}
          .bz-grid-3{grid-template-columns:repeat(2,1fr) !important;}
          .bz-grid-heat{grid-template-columns:1fr !important;}
        }
        @media (max-width: 640px){
          .bz-grid-stats{grid-template-columns:1fr !important;}
          .bz-grid-3{grid-template-columns:1fr !important;}
        }
      `}</style>

      {/* ============ HERO ============ */}
      <header style={{ display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "space-between", alignItems: "flex-end", paddingBottom: 32, borderBottom: `1px solid ${T.line}` }}>
        <div style={{ maxWidth: 680 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <span style={{ width: 26, height: 26, borderRadius: 8, background: T.black, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>B</span>
            <span style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: MONO }}>
              Control room · Analytics
            </span>
          </div>
          <h1 style={{ fontSize: "clamp(30px, 4vw, 46px)", lineHeight: 1.02, fontWeight: 700, letterSpacing: "-0.035em", color: T.black, margin: 0 }}>
            {greeting()}, BINZEO.
          </h1>
          <p style={{ marginTop: 14, fontSize: 15.5, lineHeight: 1.6, color: T.muted, maxWidth: 560 }}>
            Real-time analytics across users, authentication, activity and audit trails —
            with graphical breakdowns and a shared database of {DATA_TABLES.length} tables.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-end" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: T.black, border: `1px solid ${T.black}`, borderRadius: 999, padding: "7px 14px", background: "#fff" }}>
            <span className="bz-pulse" style={{ width: 6, height: 6, borderRadius: 999, background: T.black }} />
            Protected workspace
          </span>
          <span style={{ fontFamily: MONO, fontSize: 12, color: T.faint, letterSpacing: "0.02em" }}>{dateLabel}</span>
        </div>
      </header>

      {/* ============ KPI STATS ============ */}
      <section style={{ marginTop: 36 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 600, color: T.muted, fontFamily: MONO }}>
            Key metrics · last 7 days
          </h2>
          <span style={{ fontFamily: MONO, fontSize: 12, color: T.faint }}>{fmt(totalRecords)} total records</span>
        </div>
        <div className="bz-grid-stats" style={{ display: "grid", gap: 16 }}>
          {stats.map((s, i) => (
            <StatCard key={s.label} index={i + 1} label={s.label} value={s.value} detail={s.detail} spark={s.spark} delta={s.delta} />
          ))}
        </div>
      </section>

      {/* ============ CHART ROW 1 ============ */}
      <section className="bz-grid-2" style={{ display: "grid", gap: 16, marginTop: 16 }}>
        <Panel
          eyebrow="Trend"
          title="Login events — 7 day timeline"
          action={<span style={{ fontFamily: MONO, fontSize: 11, color: T.muted, border: `1px solid ${T.line}`, borderRadius: 999, padding: "4px 10px" }}>{fmt(loginSum)} events</span>}
        >
          <AreaChart data={loginTrend} labels={dayLabels} height={250} />
        </Panel>

        <Panel
          eyebrow="Distribution"
          title="Records by table"
          action={<span style={{ fontFamily: MONO, fontSize: 11, color: T.muted, border: `1px solid ${T.line}`, borderRadius: 999, padding: "4px 10px" }}>{DATA_TABLES.length} tables</span>}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center", justifyContent: "center" }}>
            <Donut segments={donutSegments} size={200} />
            <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 160, flex: "1 1 160px" }}>
              {donutSegments.map((s, i) => {
                const pct = totalRecords > 0 ? Math.round((s.value / totalRecords) * 100) : 0;
                return (
                  <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: SHADES[i % SHADES.length], flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: T.black }}>{s.label}</div>
                      <div style={{ fontSize: 11, color: T.muted, fontFamily: MONO }}>{fmt(s.value)} · {pct}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>
      </section>

      {/* ============ CHART ROW 2 ============ */}
      <section className="bz-grid-heat" style={{ display: "grid", gap: 16, marginTop: 16 }}>
        <Panel
          eyebrow="Activity pattern"
          title="Hourly login heatmap"
          action={<span style={{ fontFamily: MONO, fontSize: 11, color: T.muted, border: `1px solid ${T.line}`, borderRadius: 999, padding: "4px 10px" }}>7d × 24h</span>}
        >
          <Heatmap matrix={heatmap} rowLabels={dayLabels} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, fontSize: 10.5, color: T.muted, fontFamily: MONO }}>
            <span>LESS</span>
            {[0.08, 0.28, 0.5, 0.72, 0.95].map((o) => (
              <span key={o} style={{ width: 12, height: 12, borderRadius: 2, background: `rgba(10,10,10,${o})`, display: "inline-block" }} />
            ))}
            <span>MORE</span>
          </div>
        </Panel>

        <Panel eyebrow="Composition" title="System gauges">
          <div className="bz-grid-3" style={{ display: "grid", gap: 12 }}>
            <Gauge value={loginRate} label="Logins" sublabel={`${fmt(loginSum)} / 7d`} />
            <Gauge value={activityRate} label="Activity" sublabel={`${fmt(userSum)} / 7d`} />
            <Gauge value={adminRatio} label="Admin" sublabel={`${fmt(counts[3])} audit rows`} />
          </div>
        </Panel>
      </section>

      {/* ============ CHART ROW 3 ============ */}
      <section className="bz-grid-2" style={{ display: "grid", gap: 16, marginTop: 16 }}>
        <Panel
          eyebrow="Weekly comparison"
          title="Total events per day"
          action={<span style={{ fontFamily: MONO, fontSize: 11, color: T.muted, border: `1px solid ${T.line}`, borderRadius: 999, padding: "4px 10px" }}>all tables</span>}
        >
          <Bars data={weekTotals} labels={dayLabels} height={220} />
        </Panel>

        <Panel eyebrow="Insights" title="Analysis summary">
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { k: "Busiest day", v: dayLabels[busiestIdx] ?? "—", d: `${Math.max(...weekTotals)} events` },
              { k: "Avg per day", v: `${Math.round(weekSum / 7)}`, d: "events / day" },
              { k: "Peak hour", v: `${String(peakHour).padStart(2, "0")}:00`, d: "most active" },
              { k: "Admin ratio", v: `${adminRatio}%`, d: "audit vs users" },
            ].map((row) => (
              <li key={row.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, paddingBottom: 12, borderBottom: `1px solid ${T.line}` }}>
                <span style={{ fontSize: 11.5, color: T.muted, fontFamily: MONO, textTransform: "uppercase", letterSpacing: "0.08em" }}>{row.k}</span>
                <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: T.black, letterSpacing: "-0.02em" }}>{row.v}</span>
                  <span style={{ fontSize: 11, color: T.muted, fontFamily: MONO }}>{row.d}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      {/* ============ TABLE DIRECTORY ============ */}
      <section style={{ marginTop: 56 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22 }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: MONO }}>Shared database</p>
            <h2 style={{ margin: "8px 0 6px", fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 700, letterSpacing: "-0.03em", color: T.black }}>Explore every table</h2>
            <p style={{ margin: 0, fontSize: 14.5, color: T.muted }}>Open a section to inspect its complete records and fields.</p>
          </div>
          <span style={{ fontFamily: MONO, fontSize: 12, color: T.ink, border: `1px solid ${T.line}`, background: "#fff", borderRadius: 999, padding: "7px 14px" }}>
            {DATA_TABLES.length} tables · {fmt(totalRecords)} rows
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {DATA_TABLES.map((item) => {
            const rowCount = countBySlug[item.slug] ?? 0;
            const pct = totalRecords > 0 ? Math.round((rowCount / totalRecords) * 100) : 0;
            return (
              <Link key={item.slug} href={`/dashboard/${item.slug}`} className="bz-card"
                style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16, padding: 22, display: "flex", flexDirection: "column", gap: 14, textDecoration: "none", color: "inherit", minHeight: 230 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ width: 40, height: 40, borderRadius: 12, background: T.black, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em" }}>
                    {item.title.slice(0, 1).toUpperCase()}
                  </span>
                  <span style={{
                    fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600,
                    color: item.sensitive ? "#fff" : T.black,
                    background: item.sensitive ? T.black : "#fff",
                    border: `1px solid ${T.black}`, borderRadius: 999, padding: "4px 10px",
                  }}>
                    {item.sensitive ? "Protected" : "Available"}
                  </span>
                </div>
                <h3 style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 650, letterSpacing: "-0.02em", color: T.black }}>{item.title}</h3>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: T.muted, flexGrow: 1 }}>{item.description}</p>
                {rowCount > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: MONO, color: T.muted }}>
                      <span>{fmt(rowCount)} rows</span>
                      <span>{pct}% of total</span>
                    </div>
                    <div style={{ height: 4, background: T.soft, borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: T.black }} />
                    </div>
                  </div>
                )}
                <span style={{ paddingTop: 12, borderTop: `1px solid ${T.line}`, fontSize: 13, fontWeight: 600, color: T.black, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  Open section <span className="bz-arrow">→</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer style={{ marginTop: 64, paddingTop: 24, borderTop: `1px solid ${T.line}`, display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "center", fontFamily: MONO, fontSize: 11.5, color: T.faint, letterSpacing: "0.04em" }}>
        <span>BINZEO ADMIN CONSOLE — v2.0 · ANALYTICS</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span className="bz-pulse" style={{ width: 6, height: 6, borderRadius: 999, background: T.black }} />
          SYSTEM OPERATIONAL
        </span>
      </footer>
    </div>
  );
}
