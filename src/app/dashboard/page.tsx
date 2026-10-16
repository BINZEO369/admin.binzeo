import Link from "next/link";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/admin";
import { centralApiGet } from "@/lib/central-api";
import { DATA_TABLES } from "@/lib/data-tables";

/* ================= TOKENS ================= */
const T = {
  black: "#0A0A0A", ink: "#171717", gray700: "#404040", muted: "#737373",
  faint: "#A3A3A3", gray300: "#D4D4D4", line: "#E5E5E5", soft: "#F5F5F5",
  canvas: "#FAFAFA", surface: "#FFFFFF",
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
const localKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const ago = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

type LogRow = { user_id?: string | null; created_at: string };
type RangeKey = "7d" | "30d" | "90d";

const RANGE_CFG: Record<RangeKey, { days: number; bucket: number; label: string }> = {
  "7d": { days: 7, bucket: 1, label: "Last 7 days" },
  "30d": { days: 30, bucket: 1, label: "Last 30 days" },
  "90d": { days: 90, bucket: 7, label: "Last 90 days" },
};

/* ================= ANIMATED GLOBAL CSS ================= */
const ANIM_CSS = `
  /* base keyframes */
  @keyframes bzDraw     { to   { stroke-dashoffset: 0; } }
  @keyframes bzFadeIn   { from { opacity: 0; }              to { opacity: 1; } }
  @keyframes bzPop      { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
  @keyframes bzGrowY    { from { transform: scaleY(0); }    to { transform: scaleY(1); } }
  @keyframes bzRiseUp   { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes bzGauge    { to   { stroke-dashoffset: 0; } }
  @keyframes bzPulse    { 0%,100% { opacity: 1; } 50% { opacity: .28; } }
  @keyframes bzShimmer  { from { background-position: -200% 0; } to { background-position: 200% 0; } }

  /* chart primitives */
  .bz-line-path { stroke-dasharray: 2000; stroke-dashoffset: 2000; animation: bzDraw 1.6s cubic-bezier(.4,0,.2,1) forwards; }
  .bz-spark-line { stroke-dasharray: 500; stroke-dashoffset: 500; animation: bzDraw 1.1s cubic-bezier(.4,0,.2,1) forwards; }
  .bz-area-path { opacity: 0; animation: bzFadeIn .9s ease-out .45s forwards; }
  .bz-spark-area { opacity: 0; animation: bzFadeIn .7s ease-out .3s forwards; }
  .bz-point-dot { transform-box: fill-box; transform-origin: center; opacity: 0; animation: bzPop .35s ease-out forwards; }
  .bz-spark-dot { transform-box: fill-box; transform-origin: center; opacity: 0; animation: bzPop .35s ease-out 1s forwards; }
  .bz-bar-rect { transform-box: fill-box; transform-origin: bottom; transform: scaleY(0); animation: bzGrowY .8s cubic-bezier(.2,.7,.2,1) forwards; }
  .bz-heat-cell { opacity: 0; animation: bzFadeIn .55s ease-out forwards; }
  .bz-donut-seg { opacity: 0; animation: bzFadeIn .8s ease-out forwards; }
  .bz-gauge-arc { animation: bzGauge 1.2s cubic-bezier(.4,0,.2,1) forwards; }
  .bz-fade-up { opacity: 0; animation: bzRiseUp .55s cubic-bezier(.2,.7,.2,1) forwards; }
  .bz-number { display: inline-block; opacity: 0; animation: bzRiseUp .5s ease-out forwards; }

  /* UI */
  .bz-card { transition: transform .22s cubic-bezier(.2,.7,.2,1), border-color .22s ease, box-shadow .22s ease; }
  .bz-card:hover { transform: translateY(-3px); border-color: ${T.black}; box-shadow: 0 18px 40px -22px rgba(0,0,0,.28); }
  .bz-card:hover .bz-arrow { transform: translateX(5px); }
  .bz-arrow { transition: transform .22s ease; display: inline-block; }
  .bz-pulse { animation: bzPulse 2.2s ease-in-out infinite; }

  /* grid */
  .bz-grid-stats { grid-template-columns: repeat(5,1fr); }
  .bz-grid-2 { grid-template-columns: 2fr 1fr; }
  .bz-grid-3 { grid-template-columns: 1fr 1fr 1fr; }
  .bz-grid-4 { grid-template-columns: repeat(4,1fr); }
  .bz-grid-heat { grid-template-columns: 2fr 1fr; }
  @media (max-width:1200px){
    .bz-grid-stats{grid-template-columns:repeat(3,1fr)!important}
    .bz-grid-3{grid-template-columns:1fr 1fr!important}
  }
  @media (max-width:1100px){
    .bz-grid-stats{grid-template-columns:repeat(2,1fr)!important}
    .bz-grid-2{grid-template-columns:1fr!important}
    .bz-grid-heat{grid-template-columns:1fr!important}
    .bz-grid-4{grid-template-columns:repeat(2,1fr)!important}
  }
  @media (max-width:640px){
    .bz-grid-stats,.bz-grid-3,.bz-grid-4{grid-template-columns:1fr!important}
  }

  @media (prefers-reduced-motion: reduce){
    .bz-line-path,.bz-spark-line,.bz-area-path,.bz-spark-area,.bz-point-dot,.bz-spark-dot,
    .bz-bar-rect,.bz-heat-cell,.bz-donut-seg,.bz-gauge-arc,.bz-fade-up,.bz-number{
      animation: none !important; opacity: 1 !important; transform: none !important; stroke-dashoffset: 0 !important;
    }
  }
`;

/* ================= CHART: Sparkline (animated) ================= */
function Sparkline({ data, w = 90, h = 30 }: { data: number[]; w?: number; h?: number }) {
  if (!data || data.length < 2) {
    return <div style={{ width: w, height: h }} aria-hidden />;
  }
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

/* ================= CHART: Area (animated draw) ================= */
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
  const tickEvery = Math.max(1, Math.ceil(labels.length / 10));

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
      <path d={area} fill="url(#bzAreaFill)" className="bz-area-path" />
      <path d={line} fill="none" stroke={T.black} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" className="bz-line-path" />
      {pts.map((p, i) =>
        i % tickEvery === 0 || i === pts.length - 1 ? (
          <g key={i}>
            <circle
              cx={p[0]} cy={p[1]} r="3.5"
              fill={T.surface} stroke={T.black} strokeWidth="2"
              className="bz-point-dot"
              style={{ animationDelay: `${0.6 + i * 0.05}s` }}
            />
            <text x={p[0]} y={h - 10} fontSize="10" fill={T.muted} textAnchor="middle" fontFamily={MONO}>{labels[i] ?? ""}</text>
          </g>
        ) : null
      )}
    </svg>
  );
}

/* ================= CHART: MultiLine (animated staggered) ================= */
function MultiLine({ series, labels, height = 260 }: {
  series: { name: string; data: number[]; color: string }[];
  labels: string[]; height?: number;
}) {
  const w = 720, h = height;
  const pad = { t: 24, r: 16, b: 32, l: 44 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const allVals = series.flatMap((s) => s.data);
  const rawMax = Math.max(...allVals, 1);
  const niceMax = Math.max(5, Math.ceil(rawMax / 5) * 5);
  const step = labels.length > 1 ? iw / (labels.length - 1) : iw;
  const tickEvery = Math.max(1, Math.ceil(labels.length / 10));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height, display: "block" }}>
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
      {series.map((s, si) => {
        const pts = s.data.map((v, i) => [pad.l + i * step, pad.t + ih - (v / niceMax) * ih] as const);
        const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
        return (
          <g key={s.name}>
            <path d={path} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
              className="bz-line-path" style={{ animationDelay: `${si * 0.25}s` }} />
            {pts.map((p, i) => (
              <circle key={i} cx={p[0]} cy={p[1]} r="2.4" fill={T.surface} stroke={s.color} strokeWidth="1.6"
                className="bz-point-dot"
                style={{ animationDelay: `${1.4 + si * 0.25 + i * 0.02}s` }} />
            ))}
          </g>
        );
      })}
      {labels.map((lb, i) =>
        i % tickEvery === 0 || i === labels.length - 1 ? (
          <text key={i} x={pad.l + i * step} y={h - 10} fontSize="10" fill={T.muted} textAnchor="middle" fontFamily={MONO}>{lb}</text>
        ) : null
      )}
    </svg>
  );
}

/* ================= CHART: Donut (animated) ================= */
function Donut({ segments, size = 210 }: { segments: { label: string; value: number }[]; size?: number }) {
  const total = segments.reduce((a, b) => a + b.value, 0);
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
            className="bz-donut-seg"
            style={{ animationDelay: `${i * 0.15}s` }} />
        );
        offset += len;
        return el;
      })}
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="32" fontWeight="700" fill={T.black} fontFamily={SANS} letterSpacing="-0.03em"
        className="bz-number" style={{ animationDelay: ".3s" }}>
        {fmt(total)}
      </text>
      <text x={cx} y={cy + 20} textAnchor="middle" fontSize="9.5" fill={T.muted} fontFamily={MONO} letterSpacing="0.14em"
        className="bz-number" style={{ animationDelay: ".4s" }}>
        TOTAL RECORDS
      </text>
    </svg>
  );
}

/* ================= CHART: StackedBars (animated grow) ================= */
function StackedBars({ series, labels, height = 240 }: {
  series: { name: string; data: number[]; color: string }[];
  labels: string[]; height?: number;
}) {
  const w = 640, h = height;
  const pad = { t: 24, r: 12, b: 32, l: 34 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const totals = labels.map((_, i) => series.reduce((a, s) => a + (s.data[i] ?? 0), 0));
  const max = Math.max(...totals, 1);
  const slot = iw / Math.max(labels.length, 1);
  const bw = Math.min(slot * 0.62, 40);
  const tickEvery = Math.max(1, Math.ceil(labels.length / 10));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height, display: "block" }}>
      {[0, 0.5, 1].map((r) => (
        <line key={r} x1={pad.l} x2={w - pad.r} y1={pad.t + ih * r} y2={pad.t + ih * r} stroke={T.line} strokeDasharray="3 5" />
      ))}
      {labels.map((lb, i) => {
        let yCursor = pad.t + ih;
        const x = pad.l + i * slot + (slot - bw) / 2;
        const delay = i * 0.05;
        return (
          <g key={i}>
            {series.map((s, si) => {
              const v = s.data[i] ?? 0;
              const bh = (v / max) * ih;
              yCursor -= bh;
              return (
                <rect key={s.name} x={x} y={yCursor} width={bw} height={bh} fill={s.color} rx="1.5"
                  className="bz-bar-rect"
                  style={{ animationDelay: `${delay + si * 0.08}s` }} />
              );
            })}
            {totals[i] > 0 && (
              <text x={x + bw / 2} y={pad.t + ih - (totals[i] / max) * ih - 6} textAnchor="middle"
                fontSize="10" fill={T.black} fontFamily={MONO} fontWeight="600"
                className="bz-number" style={{ animationDelay: `${delay + 0.5}s` }}>
                {totals[i]}
              </text>
            )}
            {(i % tickEvery === 0 || i === labels.length - 1) && (
              <text x={x + bw / 2} y={h - 10} textAnchor="middle" fontSize="10" fill={T.muted} fontFamily={MONO}>{lb}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ================= CHART: Heatmap (animated stagger) ================= */
function Heatmap({ matrix, rowLabels }: { matrix: number[][]; rowLabels: string[] }) {
  const cols = 24, rows = matrix.length;
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
              x={leftPad + c * (cell + gap)} y={topPad + r * (cell + gap)}
              width={cell} height={cell} rx="2" fill={fill}
              className="bz-heat-cell"
              style={{ animationDelay: `${(r * 24 + c) * 0.004}s` }} />
          );
        })
      )}
      {rowLabels.map((d, i) => (
        <text key={d + i} x={leftPad - 8} y={topPad + i * (cell + gap) + cell * 0.72}
          fontSize="10" fill={T.muted} textAnchor="end" fontFamily={MONO}>{d}</text>
      ))}
      {[0, 6, 12, 18, 23].map((hr) => (
        <text key={hr} x={leftPad + hr * (cell + gap) + cell / 2} y={topPad + rows * (cell + gap) + 14}
          fontSize="10" fill={T.muted} textAnchor="middle" fontFamily={MONO}>{String(hr).padStart(2, "0")}</text>
      ))}
    </svg>
  );
}

/* ================= CHART: Gauge (animated fill) ================= */
function Gauge({ value, label, sublabel }: { value: number; label: string; sublabel?: string }) {
  const pct = Math.max(0, Math.min(value / 100, 1));
  const r = 54, cx = 72, cy = 72;
  const halfCirc = Math.PI * r;
  const path = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const dash = halfCirc * pct;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg viewBox="0 0 144 92" style={{ width: "100%", maxWidth: 150, display: "block" }}>
        <path d={path} fill="none" stroke={T.soft} strokeWidth="11" strokeLinecap="round" />
        <path d={path} fill="none" stroke={T.black} strokeWidth="11" strokeLinecap="round"
          strokeDasharray={`${dash} ${halfCirc}`}
          strokeDashoffset={dash}
          className="bz-gauge-arc" />
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize="22" fontWeight="700" fill={T.black} fontFamily={SANS} letterSpacing="-0.03em"
          className="bz-number" style={{ animationDelay: ".6s" }}>
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

/* ================= UI COMPONENTS ================= */
function Panel({ title, eyebrow, action, children, delay = 0 }: {
  title: string; eyebrow?: string; action?: ReactNode; children: ReactNode; delay?: number;
}) {
  return (
    <div className="bz-fade-up" style={{
      background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16, padding: 22,
      display: "flex", flexDirection: "column", gap: 16, minWidth: 0,
      animationDelay: `${delay}s`,
    }}>
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

function StatCard({ label, value, detail, spark, index, delta, anomaly, delay = 0 }: {
  label: string; value: number; detail: string; spark: number[]; index: number; delta?: number; anomaly?: boolean; delay?: number;
}) {
  return (
    <div className="bz-fade-up" style={{
      background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16,
      padding: "20px 20px 16px", display: "flex", flexDirection: "column", gap: 14,
      minHeight: 176, minWidth: 0, animationDelay: `${delay}s`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: MONO }}>{label}</span>
        <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          {anomaly && (
            <span title="Unusual activity detected" style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, color: "#fff", background: T.black, borderRadius: 999, padding: "3px 7px", letterSpacing: "0.08em" }}>
              ★ SPIKE
            </span>
          )}
          <span style={{ fontFamily: MONO, fontSize: 10.5, color: T.faint, border: `1px solid ${T.line}`, borderRadius: 999, padding: "2px 7px" }}>
            {String(index).padStart(2, "0")}
          </span>
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <div className="bz-number" style={{ fontSize: 40, lineHeight: 1, fontWeight: 700, letterSpacing: "-0.035em", color: T.black, fontVariantNumeric: "tabular-nums", animationDelay: `${delay + 0.1}s` }}>
          {fmt(value)}
        </div>
        {spark.length >= 2 && <Sparkline data={spark} w={90} h={30} />}
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

function RangeTabs({ active, basePath = "" }: { active: RangeKey; basePath?: string }) {
  const items: RangeKey[] = ["7d", "30d", "90d"];
  return (
    <div style={{ display: "inline-flex", border: `1px solid ${T.line}`, borderRadius: 999, background: "#fff", padding: 3, gap: 2 }}>
      {items.map((k) => {
        const on = k === active;
        return (
          <Link key={k} href={`${basePath}?range=${k}`}
            style={{
              padding: "6px 14px", borderRadius: 999, fontSize: 12, fontFamily: MONO, fontWeight: 600,
              textDecoration: "none", letterSpacing: "0.04em",
              background: on ? T.black : "transparent",
              color: on ? "#fff" : T.muted,
              transition: "background .2s ease, color .2s ease",
            }}>
            {k.toUpperCase()}
          </Link>
        );
      })}
    </div>
  );
}

function HealthDot({ level }: { level: "ok" | "warn" | "bad" }) {
  const color = level === "ok" ? T.black : level === "warn" ? T.gray700 : T.faint;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.08em",
      color: T.ink, fontWeight: 600,
    }}>
      <span className={level === "ok" ? "bz-pulse" : ""} style={{ width: 7, height: 7, borderRadius: 999, background: color, flexShrink: 0 }} />
      {level === "ok" ? "OK" : level === "warn" ? "WARN" : "IDLE"}
    </span>
  );
}

/* ================= PAGE ================= */
export default async function Dashboard({
  searchParams,
}: {
  searchParams?: Promise<{ range?: string }> | { range?: string };
}) {
  const context = await requireAdmin();

  const sp = await Promise.resolve(searchParams ?? {});
  const canReadDatabase = context.access.roles.includes("super_admin") || context.access.permissions.includes("database.read");
  const rangeKey: RangeKey = (["7d", "30d", "90d"].includes(sp.range ?? "") ? sp.range : "7d") as RangeKey;
  const cfg = RANGE_CFG[rangeKey];

  let counts: number[] = [];
  let loginRows: LogRow[] = [];
  let userActRows: LogRow[] = [];
  let adminActRows: LogRow[] = [];
  let profileRows: { created_at: string }[] = [];
  let dataLoadError = false;
  const result = await centralApiGet<{ counts: number[]; login_rows: LogRow[]; user_activity_rows: LogRow[]; admin_activity_rows: LogRow[]; profile_rows: { created_at: string }[] }>("/v1/admin/dashboard/summary");
  if (result.ok) {
    counts = result.data.counts;
    loginRows = result.data.login_rows;
    userActRows = result.data.user_activity_rows;
    adminActRows = result.data.admin_activity_rows;
    profileRows = result.data.profile_rows;
  } else {
    counts = [0, 0, 0, 0];
    dataLoadError = true;
  }

  const countBySlug: Record<string, number> = {
    profiles: counts[0], user_login_history: counts[1],
    user_activity_logs: counts[2], admin_activity_logs: counts[3],
  };

  /* -------- day keys for current range -------- */
  const dayKeys: string[] = [];
  for (let i = cfg.days - 1; i >= 0; i--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    dayKeys.push(localKey(d));
  }

  function bucketize(rows: { created_at: string }[]): number[] {
    const perDay = new Map<string, number>();
    rows.forEach((r) => {
      const k = localKey(new Date(r.created_at));
      perDay.set(k, (perDay.get(k) ?? 0) + 1);
    });
    const out: number[] = [];
    for (let i = 0; i < dayKeys.length; i += cfg.bucket) {
      let sum = 0;
      for (let j = 0; j < cfg.bucket && i + j < dayKeys.length; j++) sum += perDay.get(dayKeys[i + j]) ?? 0;
      out.push(sum);
    }
    return out;
  }

  function labelsFor(): string[] {
    const out: string[] = [];
    for (let i = 0; i < dayKeys.length; i += cfg.bucket) {
      const [y, m, d] = dayKeys[i].split("-").map(Number);
      const dt = new Date(y, m - 1, d);
      out.push(cfg.bucket === 1
        ? dt.toLocaleDateString("en-US", { weekday: "short" })
        : dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
    }
    return out;
  }

  const labels = labelsFor();
  const loginTrend = bucketize(loginRows);
  const userTrend = bucketize(userActRows);
  const adminTrend = bucketize(adminActRows);
  const signupTrend = bucketize(profileRows);

  /* -------- real cumulative user growth (from signups) -------- */
  const signupSum = signupTrend.reduce((a, b) => a + b, 0);
  const startUsers = Math.max(0, counts[0] - signupSum);
  let acc = startUsers;
  const userCumulative = signupTrend.map((v) => { acc += v; return acc; });

  /* -------- heatmap (always last 7 days) -------- */
  const heatDays: string[] = [];
  const heatLabels: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    heatDays.push(localKey(d));
    heatLabels.push(d.toLocaleDateString("en-US", { weekday: "short" }));
  }
  const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  loginRows.forEach((r) => {
    const d = new Date(r.created_at);
    const idx = heatDays.indexOf(localKey(d));
    if (idx >= 0) heatmap[idx][d.getHours()]++;
  });

  /* -------- delta / anomaly (all real, no fallbacks) -------- */
  const delta = (arr: number[]) => {
    if (arr.length < 2) return 0;
    const last = arr[arr.length - 1], prev = arr[arr.length - 2];
    if (prev === 0) return last > 0 ? 100 : 0;
    return Math.round(((last - prev) / prev) * 100);
  };
  const isAnomaly = (arr: number[]) => {
    if (arr.length < 4) return false;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    if (mean === 0) return false;
    return arr[arr.length - 1] > mean * 2.2;
  };

  /* -------- totals -------- */
  const totalRecords = counts.reduce((a, b) => a + b, 0);
  const loginSum = loginTrend.reduce((a, b) => a + b, 0);
  const userSum = userTrend.reduce((a, b) => a + b, 0);
  const adminSum = adminTrend.reduce((a, b) => a + b, 0);

  /* -------- WoW (real) -------- */
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - 6);
  const prevStart = new Date(now); prevStart.setDate(prevStart.getDate() - 13);
  const prevEnd = new Date(now); prevEnd.setDate(prevEnd.getDate() - 7);
  function inRange(rows: LogRow[], a: Date, b: Date) {
    const av = a.getTime(), bv = b.getTime();
    return rows.filter((r) => { const t = new Date(r.created_at).getTime(); return t >= av && t <= bv; }).length;
  }
  const wow = [
    { label: "Logins", cur: inRange(loginRows, weekStart, now), prev: inRange(loginRows, prevStart, prevEnd) },
    { label: "Activity", cur: inRange(userActRows, weekStart, now), prev: inRange(userActRows, prevStart, prevEnd) },
    { label: "Admin", cur: inRange(adminActRows, weekStart, now), prev: inRange(adminActRows, prevStart, prevEnd) },
  ].map((r) => ({ ...r, delta: r.prev === 0 ? (r.cur > 0 ? 100 : 0) : Math.round(((r.cur - r.prev) / r.prev) * 100) }));

  /* -------- top users (real) -------- */
  const userScore = new Map<string, number>();
  [...loginRows, ...userActRows, ...adminActRows].forEach((r) => {
    const id = r.user_id; if (!id) return;
    userScore.set(id, (userScore.get(id) ?? 0) + 1);
  });
  const topUsers = Array.from(userScore.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const topMax = topUsers[0]?.[1] ?? 1;

  /* -------- live feed (real) -------- */
  const feed = [
    ...loginRows.map((r) => ({ ...r, kind: "login" as const })),
    ...userActRows.map((r) => ({ ...r, kind: "activity" as const })),
    ...adminActRows.map((r) => ({ ...r, kind: "admin" as const })),
  ].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 8);

  /* -------- insights (real) -------- */
  const weekTotals = labels.map((_, i) => loginTrend[i] + userTrend[i] + adminTrend[i]);
  const busiestIdx = weekTotals.length ? weekTotals.indexOf(Math.max(...weekTotals)) : -1;
  const weekSum = weekTotals.reduce((a, b) => a + b, 0);
  const avg = weekTotals.length ? Math.round(weekSum / weekTotals.length) : 0;
  const heatFlat = heatmap.flat();
  const heatMax = Math.max(...heatFlat, 0);
  const peakHour = heatMax > 0 ? heatFlat.indexOf(heatMax) % 24 : null;

  const loginRate = totalRecords > 0 ? Math.min(100, Math.round((loginSum / totalRecords) * 100)) : 0;
  const activityRate = totalRecords > 0 ? Math.min(100, Math.round((userSum / totalRecords) * 100)) : 0;
  const retention = counts[0] > 0 ? Math.min(100, Math.round((userScore.size / counts[0]) * 100)) : 0;

  /* -------- health (real) -------- */
  const latestEvent = [...loginRows, ...userActRows, ...adminActRows]
    .reduce<string | null>((acc2, r) => (!acc2 || r.created_at > acc2 ? r.created_at : acc2), null);
  const freshMinutes = latestEvent ? Math.floor((Date.now() - +new Date(latestEvent)) / 60000) : Infinity;
  const health = {
    freshness: freshMinutes === Infinity ? "bad" : freshMinutes < 60 ? "ok" : freshMinutes < 1440 ? "warn" : "bad",
    coverage: retention > 40 ? "ok" : retention > 15 ? "warn" : "bad",
    tables: "ok" as const,
    retention: retention > 50 ? "ok" : retention > 20 ? "warn" : "bad",
  } as const;

  const dateLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const csv = [
    "date,logins,activity,admin,signups",
    ...labels.map((lb, i) => `${lb},${loginTrend[i] ?? 0},${userTrend[i] ?? 0},${adminTrend[i] ?? 0},${signupTrend[i] ?? 0}`),
  ].join("\n");
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;

  const stats = [
    { label: "Users", value: counts[0], detail: "Profiles in directory", spark: userCumulative, delta: undefined as number | undefined, anomaly: false },
    { label: "Signups", value: signupSum, detail: `New in ${cfg.label.toLowerCase()}`, spark: signupTrend, delta: delta(signupTrend), anomaly: isAnomaly(signupTrend) },
    { label: "Login events", value: loginSum, detail: "Authentication records", spark: loginTrend, delta: delta(loginTrend), anomaly: isAnomaly(loginTrend) },
    { label: "User activity", value: userSum, detail: "Account activity logs", spark: userTrend, delta: delta(userTrend), anomaly: isAnomaly(userTrend) },
    { label: "Admin audit", value: adminSum, detail: "Administrative actions", spark: adminTrend, delta: delta(adminTrend), anomaly: isAnomaly(adminTrend) },
  ];

  const donutSegments = [
    { label: "Profiles", value: counts[0] },
    { label: "Login events", value: counts[1] },
    { label: "User activity", value: counts[2] },
    { label: "Admin audit", value: counts[3] },
  ];

  return (
    <div style={{ background: T.canvas, minHeight: "100%", padding: "40px clamp(20px, 4vw, 56px) 80px", color: T.ink, fontFamily: SANS }}>
      <style>{ANIM_CSS}</style>
      {dataLoadError && <p role="alert" style={{ margin: "16px 0", color: "#9A3412" }}>Central analytics could not be loaded. Retry shortly; no direct database fallback was used.</p>}

      {/* ============ HERO ============ */}
      <header style={{ display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "space-between", alignItems: "flex-end", paddingBottom: 32, borderBottom: `1px solid ${T.line}` }}>
        <div style={{ maxWidth: 680 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <span style={{ width: 26, height: 26, borderRadius: 8, background: T.black, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>B</span>
            <span style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: MONO }}>
              Control room · Analytics suite v4
            </span>
          </div>
          <h1 style={{ fontSize: "clamp(30px, 4vw, 46px)", lineHeight: 1.02, fontWeight: 700, letterSpacing: "-0.035em", color: T.black, margin: 0 }}>
            {greeting()}, BINZEO.
          </h1>
          <p style={{ marginTop: 14, fontSize: 15.5, lineHeight: 1.6, color: T.muted, maxWidth: 620 }}>
            Full-stack analytics across {cfg.label.toLowerCase()} — trends, retention, anomalies and live activity across {DATA_TABLES.length} tables. Every chart is animated and reads directly from your live data.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-end" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <RangeTabs active={rangeKey} />
            <a href={csvHref} download={`binzeo-analytics-${rangeKey}.csv`}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: T.black, border: `1px solid ${T.black}`, borderRadius: 999, padding: "7px 14px", background: "#fff", textDecoration: "none", fontFamily: MONO, letterSpacing: "0.04em", transition: "background .2s ease, color .2s ease" }}>
              ↓ Export CSV
            </a>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11.5, fontWeight: 600, color: T.black, border: `1px solid ${T.line}`, borderRadius: 999, padding: "6px 12px", background: "#fff" }}>
              <span className="bz-pulse" style={{ width: 6, height: 6, borderRadius: 999, background: T.black }} />
              Protected workspace
            </span>
            <span style={{ fontFamily: MONO, fontSize: 11.5, color: T.faint }}>{dateLabel}</span>
          </div>
        </div>
      </header>

      {/* ============ KPI STATS ============ */}
      <section style={{ marginTop: 36 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 600, color: T.muted, fontFamily: MONO }}>
            Key metrics · {cfg.label}
          </h2>
          <span style={{ fontFamily: MONO, fontSize: 12, color: T.faint }}>{fmt(totalRecords)} total records · live</span>
        </div>
        <div className="bz-grid-stats" style={{ display: "grid", gap: 16 }}>
          {stats.map((s, i) => (
            <StatCard key={s.label} index={i + 1} label={s.label} value={s.value} detail={s.detail}
              spark={s.spark} delta={s.delta} anomaly={s.anomaly} delay={0.05 * i} />
          ))}
        </div>
      </section>

      {/* ============ ROW 1 ============ */}
      <section className="bz-grid-2" style={{ display: "grid", gap: 16, marginTop: 16 }}>
        <Panel eyebrow="Trend comparison" title={`Activity streams — ${cfg.label.toLowerCase()}`} delay={0.1}
          action={
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {[{ n: "Logins", c: SHADES[0] }, { n: "User", c: SHADES[1] }, { n: "Admin", c: SHADES[2] }].map((s) => (
                <span key={s.n} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: T.muted, fontFamily: MONO }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: s.c }} />{s.n}
                </span>
              ))}
            </div>
          }>
          <MultiLine
            series={[
              { name: "Logins", data: loginTrend, color: SHADES[0] },
              { name: "User", data: userTrend, color: SHADES[1] },
              { name: "Admin", data: adminTrend, color: SHADES[2] },
            ]}
            labels={labels} height={260} />
        </Panel>

        <Panel eyebrow="Distribution" title="Records by table" delay={0.15}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center", justifyContent: "center" }}>
            <Donut segments={donutSegments} size={200} />
            <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 160, flex: "1 1 160px" }}>
              {donutSegments.map((s, i) => {
                const pct = totalRecords > 0 ? Math.round((s.value / totalRecords) * 100) : 0;
                return (
                  <div key={s.label} className="bz-fade-up" style={{ display: "flex", alignItems: "center", gap: 10, animationDelay: `${0.3 + i * 0.08}s` }}>
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

      {/* ============ ROW 2 ============ */}
      <section className="bz-grid-2" style={{ display: "grid", gap: 16, marginTop: 16 }}>
        <Panel eyebrow="Combined volume" title="Daily event breakdown" delay={0.2}
          action={
            <div style={{ display: "flex", gap: 12 }}>
              {[{ n: "Logins", c: SHADES[0] }, { n: "User", c: SHADES[1] }, { n: "Admin", c: SHADES[2] }].map((s) => (
                <span key={s.n} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, color: T.muted, fontFamily: MONO }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: s.c }} />{s.n}
                </span>
              ))}
            </div>
          }>
          <StackedBars
            series={[
              { name: "Logins", data: loginTrend, color: SHADES[0] },
              { name: "User", data: userTrend, color: SHADES[1] },
              { name: "Admin", data: adminTrend, color: SHADES[2] },
            ]}
            labels={labels} height={240} />
        </Panel>

        <Panel eyebrow="Composition" title="Coverage gauges" delay={0.25}>
          <div className="bz-grid-3" style={{ display: "grid", gap: 12 }}>
            <Gauge value={loginRate} label="Logins" sublabel={`${fmt(loginSum)} / ${rangeKey}`} />
            <Gauge value={activityRate} label="Activity" sublabel={`${fmt(userSum)} / ${rangeKey}`} />
            <Gauge value={retention} label="Retention" sublabel={`${userScore.size} / ${counts[0]} active`} />
          </div>
        </Panel>
      </section>

      {/* ============ ROW 3 ============ */}
      <section className="bz-grid-heat" style={{ display: "grid", gap: 16, marginTop: 16 }}>
        <Panel eyebrow="Activity pattern" title="Hourly login heatmap" delay={0.3}
          action={<span style={{ fontFamily: MONO, fontSize: 11, color: T.muted, border: `1px solid ${T.line}`, borderRadius: 999, padding: "4px 10px" }}>7d × 24h</span>}>
          <Heatmap matrix={heatmap} rowLabels={heatLabels} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, fontSize: 10.5, color: T.muted, fontFamily: MONO }}>
            <span>LESS</span>
            {[0.08, 0.28, 0.5, 0.72, 0.95].map((o) => (
              <span key={o} style={{ width: 12, height: 12, borderRadius: 2, background: `rgba(10,10,10,${o})`, display: "inline-block" }} />
            ))}
            <span>MORE</span>
          </div>
        </Panel>

        <Panel eyebrow="System health" title="Live indicators" delay={0.35}>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 0 }}>
            {[
              { k: "Data freshness", v: freshMinutes === Infinity ? "no data yet" : ago(latestEvent!), l: health.freshness },
              { k: "Coverage", v: `${retention}% of profiles`, l: health.coverage },
              { k: "Tables online", v: `${DATA_TABLES.length} / ${DATA_TABLES.length}`, l: health.tables },
              { k: "Retention", v: `${userScore.size} active users`, l: health.retention },
            ].map((r, i) => (
              <li key={r.k} className="bz-fade-up" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${T.line}`, animationDelay: `${0.4 + i * 0.06}s` }}>
                <span style={{ fontSize: 11, color: T.muted, fontFamily: MONO, textTransform: "uppercase", letterSpacing: "0.08em" }}>{r.k}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 12.5, color: T.ink, fontWeight: 600 }}>{r.v}</span>
                  <HealthDot level={r.l as "ok" | "warn" | "bad"} />
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      {/* ============ ROW 4 ============ */}
      <section className="bz-grid-3" style={{ display: "grid", gap: 16, marginTop: 16 }}>
        <Panel eyebrow="Leaderboard" title="Top active users" delay={0.4}
          action={<span style={{ fontFamily: MONO, fontSize: 11, color: T.muted, border: `1px solid ${T.line}`, borderRadius: 999, padding: "4px 10px" }}>{userScore.size} tracked</span>}>
          {topUsers.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", fontSize: 12.5, color: T.muted, fontFamily: MONO }}>No activity yet</div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {topUsers.map(([id, count], i) => {
                const pct = Math.round((count / topMax) * 100);
                return (
                  <li key={id} className="bz-fade-up" style={{ display: "flex", flexDirection: "column", gap: 6, animationDelay: `${0.45 + i * 0.06}s` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <span style={{ width: 20, height: 20, borderRadius: 6, background: i < 3 ? T.black : T.soft, color: i < 3 ? "#fff" : T.muted, fontSize: 10.5, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                        <span style={{ fontFamily: MONO, fontSize: 11.5, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{id.slice(0, 8)}…</span>
                      </span>
                      <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: T.black, flexShrink: 0 }}>{count}</span>
                    </div>
                    <div style={{ height: 4, background: T.soft, borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: T.black, transition: "width .8s cubic-bezier(.2,.7,.2,1)" }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel eyebrow="Live feed" title="Recent events" delay={0.45}
          action={<span style={{ fontFamily: MONO, fontSize: 11, color: T.muted, border: `1px solid ${T.line}`, borderRadius: 999, padding: "4px 10px" }}>last {feed.length}</span>}>
          {feed.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", fontSize: 12.5, color: T.muted, fontFamily: MONO }}>No recent events</div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 0 }}>
              {feed.map((e, i) => (
                <li key={i} className="bz-fade-up" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < feed.length - 1 ? `1px solid ${T.line}` : "none", animationDelay: `${0.5 + i * 0.05}s` }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: e.kind === "admin" ? T.black : e.kind === "login" ? T.gray700 : T.faint, flexShrink: 0 }} />
                  <span style={{ fontFamily: MONO, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", color: T.muted, minWidth: 58 }}>{e.kind}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11.5, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                    {e.user_id ? `${e.user_id.slice(0, 8)}…` : "system"}
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: T.faint, flexShrink: 0 }}>{ago(e.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel eyebrow="Week over week" title="Current vs previous 7d" delay={0.5}>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 0 }}>
            {wow.map((r, i) => (
              <li key={r.label} className="bz-fade-up" style={{ padding: "14px 0", borderBottom: `1px solid ${T.line}`, animationDelay: `${0.55 + i * 0.08}s` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: T.muted, fontFamily: MONO, textTransform: "uppercase", letterSpacing: "0.08em" }}>{r.label}</span>
                  <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 12.5, color: r.delta >= 0 ? T.black : T.muted }}>
                    {r.delta >= 0 ? "▲" : "▼"} {Math.abs(r.delta)}%
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline", fontFamily: MONO }}>
                  <span style={{ fontSize: 22, fontWeight: 700, color: T.black, letterSpacing: "-0.02em" }}>{fmt(r.cur)}</span>
                  <span style={{ fontSize: 11, color: T.faint }}>vs {fmt(r.prev)}</span>
                </div>
              </li>
            ))}
          </ul>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 11, color: T.muted, paddingTop: 4 }}>
            <span>Busiest bucket</span>
            <span style={{ color: T.black, fontWeight: 600 }}>{busiestIdx >= 0 ? labels[busiestIdx] : "—"}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 11, color: T.muted }}>
            <span>Peak hour</span>
            <span style={{ color: T.black, fontWeight: 600 }}>{peakHour === null ? "—" : `${String(peakHour).padStart(2, "0")}:00`}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 11, color: T.muted }}>
            <span>Avg / bucket</span>
            <span style={{ color: T.black, fontWeight: 600 }}>{fmt(avg)}</span>
          </div>
        </Panel>
      </section>

      {/* ============ TABLE DIRECTORY ============ */}
      {canReadDatabase && <section style={{ marginTop: 56 }}>
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
          {DATA_TABLES.map((item, i) => {
            const rowCount = countBySlug[item.slug] ?? 0;
            const pct = totalRecords > 0 ? Math.round((rowCount / totalRecords) * 100) : 0;
            return (
              <Link key={item.slug} href={`/dashboard/${item.slug}`} className="bz-card bz-fade-up"
                style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16, padding: 22, display: "flex", flexDirection: "column", gap: 14, textDecoration: "none", color: "inherit", minHeight: 230, animationDelay: `${0.05 * i}s` }}>
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
                      <div style={{ width: `${pct}%`, height: "100%", background: T.black, transition: "width .9s cubic-bezier(.2,.7,.2,1)" }} />
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
      </section>}

      {/* ============ FOOTER ============ */}
      <footer style={{ marginTop: 64, paddingTop: 24, borderTop: `1px solid ${T.line}`, display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "center", fontFamily: MONO, fontSize: 11.5, color: T.faint, letterSpacing: "0.04em" }}>
        <span>BINZEO ADMIN CONSOLE — v4.0 · LIVE ANALYTICS</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span className="bz-pulse" style={{ width: 6, height: 6, borderRadius: 999, background: T.black }} />
          SYSTEM OPERATIONAL · {rangeKey.toUpperCase()} WINDOW
        </span>
      </footer>
    </div>
  );
}
