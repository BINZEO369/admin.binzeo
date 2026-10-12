/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EmailRecipientSelector, { type EmailRecipient } from "@/components/EmailRecipientSelector";

/* ================= TYPES ================= */
type BirthdayUser = EmailRecipient & {
  binzeo_user_id: string;
  is_today: boolean;
  birthday_delivery: { birthday_year: number; status: string; sent_at: string | null; error_message: string | null } | null;
};
type Toast = { id: number; text: string; tone: "info" | "ok" | "warn" | "error" };
type BatchInfo = { current: number; total: number; sent: number; failed: number; startedAt: number };
type WizardStep = 1 | 2 | 3;

const BATCH_SIZE = 20;

/* ================= TOKENS ================= */
const T = {
  black: "#0A0A0A", ink: "#171717", gray700: "#404040", muted: "#737373",
  faint: "#A3A3A3", gray300: "#D4D4D4", line: "#E5E5E5", soft: "#F5F5F5",
  canvas: "#FAFAFA", surface: "#FFFFFF", white: "#FFFFFF",
};
const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';
const SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif';
const SHADES = ["#0A0A0A", "#404040", "#737373", "#A3A3A3", "#D4D4D4", "#E5E5E5"];

/* ================= HELPERS ================= */
const fmt = (n: number) => n.toLocaleString("en-US");
function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return "—"; }
}
function ago(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

/* ================= ANIMATED CSS ================= */
const ANIM_CSS = `
  @keyframes bzDraw   { to { stroke-dashoffset: 0; } }
  @keyframes bzFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes bzPop    { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
  @keyframes bzGrowY  { from { transform: scaleY(0); } to { transform: scaleY(1); } }
  @keyframes bzGrowX  { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  @keyframes bzRiseUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes bzSlideInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes bzPulse  { 0%,100% { opacity: 1; } 50% { opacity: .28; } }
  @keyframes bzSpin   { to { transform: rotate(360deg); } }
  @keyframes bzStripe { from { background-position: 0 0; } to { background-position: 40px 0; } }

  .bz-spark-line { stroke-dasharray: 500; stroke-dashoffset: 500; animation: bzDraw 1s cubic-bezier(.4,0,.2,1) forwards; }
  .bz-spark-area { opacity: 0; animation: bzFadeIn .7s ease-out .3s forwards; }
  .bz-spark-dot { transform-box: fill-box; transform-origin: center; opacity: 0; animation: bzPop .35s ease-out 1s forwards; }
  .bz-hbar { transform-box: fill-box; transform-origin: left; transform: scaleX(0); animation: bzGrowX .9s cubic-bezier(.2,.7,.2,1) forwards; }
  .bz-donut-seg { opacity: 0; animation: bzFadeIn .8s ease-out forwards; }
  .bz-fade-up { opacity: 0; animation: bzRiseUp .55s cubic-bezier(.2,.7,.2,1) forwards; }
  .bz-number { display: inline-block; opacity: 0; animation: bzRiseUp .5s ease-out forwards; }
  .bz-toast-in { animation: bzSlideInRight .35s cubic-bezier(.2,.7,.2,1) forwards; }
  .bz-pulse { animation: bzPulse 2.2s ease-in-out infinite; }
  .bz-spin { animation: bzSpin .9s linear infinite; }

  .bz-card { transition: transform .22s cubic-bezier(.2,.7,.2,1), border-color .22s ease, box-shadow .22s ease; }
  .bz-card:hover { transform: translateY(-2px); border-color: ${T.black}; box-shadow: 0 14px 32px -22px rgba(0,0,0,.24); }

  .bz-seg, .bz-chip { transition: background .18s ease, color .18s ease, border-color .18s ease; cursor: pointer; user-select: none; }
  .bz-seg:hover:not(:disabled), .bz-chip:hover:not(:disabled) { border-color: ${T.black} !important; }
  .bz-seg.on, .bz-chip.on { background: ${T.black} !important; color: #fff !important; border-color: ${T.black} !important; }
  .bz-seg:disabled, .bz-chip:disabled { opacity: .42; cursor: not-allowed; }

  .bz-btn { transition: background .18s ease, color .18s ease, border-color .18s ease, transform .12s ease; cursor: pointer; }
  .bz-btn:hover:not(:disabled) { background: ${T.gray700} !important; border-color: ${T.gray700} !important; transform: translateY(-1px); }
  .bz-btn:disabled { opacity: .45; cursor: not-allowed; }
  .bz-btn-ghost { transition: background .18s ease, color .18s ease, border-color .18s ease; cursor: pointer; text-decoration: none; }
  .bz-btn-ghost:hover:not(:disabled) { background: ${T.black} !important; color: #fff !important; border-color: ${T.black} !important; }
  .bz-btn-danger { transition: background .18s ease, border-color .18s ease, transform .12s ease; cursor: pointer; }
  .bz-btn-danger:hover:not(:disabled) { background: ${T.gray700} !important; border-color: ${T.gray700} !important; color: #fff !important; }

  .bz-progress-fill {
    background-image: linear-gradient(135deg, rgba(255,255,255,.18) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.18) 50%, rgba(255,255,255,.18) 75%, transparent 75%);
    background-size: 40px 40px; animation: bzStripe .8s linear infinite;
  }

  .bz-input { transition: border-color .18s ease, box-shadow .18s ease; }
  .bz-input:focus { outline: none; border-color: ${T.black} !important; box-shadow: 0 0 0 3px rgba(10,10,10,.08); }

  .bz-grid-kpi { grid-template-columns: repeat(4, 1fr); }
  .bz-grid-2 { grid-template-columns: 1.15fr 1fr; }
  .bz-grid-3 { grid-template-columns: 1fr 1fr 1fr; }
  .bz-grid-filter { grid-template-columns: 1fr 1fr auto; }
  .bz-grid-cards { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
  @media (max-width:1200px){
    .bz-grid-kpi{grid-template-columns:repeat(2,1fr)!important}
    .bz-grid-3{grid-template-columns:1fr 1fr!important}
  }
  @media (max-width:1100px){ .bz-grid-2{grid-template-columns:1fr!important} }
  @media (max-width:640px){
    .bz-grid-kpi,.bz-grid-3,.bz-grid-filter,.bz-grid-cards{grid-template-columns:1fr!important}
  }
  @media (prefers-reduced-motion: reduce){
    .bz-spark-line,.bz-spark-area,.bz-spark-dot,.bz-hbar,.bz-donut-seg,.bz-fade-up,.bz-number,.bz-toast-in{
      animation: none !important; opacity: 1 !important; transform: none !important; stroke-dashoffset: 0 !important;
    }
    .bz-progress-fill { animation: none !important; }
  }
`;

/* ================= CHART: Sparkline ================= */
function Sparkline({ data, w = 90, h = 30 }: { data: number[]; w?: number; h?: number }) {
  if (!data || data.length < 2) return <div style={{ width: w, height: h }} aria-hidden />;
  const max = Math.max(...data, 1), min = Math.min(...data);
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

/* ================= CHART: Donut ================= */
function Donut({ segments, size = 170, centerLabel = "TOTAL", centerValue }: {
  segments: { label: string; value: number }[]; size?: number; centerLabel?: string; centerValue?: number;
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
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={SHADES[i % SHADES.length]} strokeWidth={stroke}
            strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-offset} transform={`rotate(-90 ${cx} ${cy})`}
            className="bz-donut-seg" style={{ animationDelay: `${i * 0.14}s` }} />
        );
        offset += len;
        return el;
      })}
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="30" fontWeight="700" fill={T.black} fontFamily={SANS} letterSpacing="-0.03em"
        className="bz-number" style={{ animationDelay: ".3s" }}>
        {displayTotal.toLocaleString("en-US")}
      </text>
      <text x={cx} y={cy + 18} textAnchor="middle" fontSize="9" fill={T.muted} fontFamily={MONO} letterSpacing="0.14em"
        className="bz-number" style={{ animationDelay: ".4s" }}>
        {centerLabel}
      </text>
    </svg>
  );
}

/* ================= CHART: HBars ================= */
function HBars({ segments }: { segments: { label: string; value: number; sub?: string }[] }) {
  const max = Math.max(...segments.map((s) => s.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {segments.map((s, i) => {
        const pct = (s.value / max) * 100;
        return (
          <div key={s.label} className="bz-fade-up" style={{ animationDelay: `${0.1 + i * 0.05}s` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
              <span style={{ fontSize: 12, color: T.ink, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</span>
              <span style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 700, color: T.black, flexShrink: 0 }}>
                {s.sub ? `${s.sub} · ` : ""}{s.value.toLocaleString("en-US")}
              </span>
            </div>
            <div style={{ height: 6, background: T.soft, borderRadius: 999, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: SHADES[i % SHADES.length], transformOrigin: "left", transform: "scaleX(0)",
                animation: `bzGrowX .9s cubic-bezier(.2,.7,.2,1) ${0.15 + i * 0.06}s forwards` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ================= UI: Panel ================= */
function Panel({ title, eyebrow, action, children, delay = 0 }: {
  title: string; eyebrow?: string; action?: React.ReactNode; children: React.ReactNode; delay?: number;
}) {
  return (
    <div className="bz-fade-up" style={{
      background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16, padding: 22,
      display: "flex", flexDirection: "column", gap: 16, minWidth: 0, animationDelay: `${delay}s`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          {eyebrow && <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: MONO }}>{eyebrow}</p>}
          <h3 style={{ margin: "5px 0 0", fontSize: 15.5, fontWeight: 650, letterSpacing: "-0.02em", color: T.black }}>{title}</h3>
        </div>
        {action}
      </div>
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}

/* ================= UI: KPICard ================= */
function KPICard({ label, value, detail, spark, index, delay = 0 }: {
  label: string; value: number | string; detail: string; spark?: number[]; index: number; delay?: number;
}) {
  return (
    <div className="bz-fade-up" style={{
      background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14,
      padding: "16px 18px 14px", display: "flex", flexDirection: "column", gap: 12,
      minHeight: 140, minWidth: 0, animationDelay: `${delay}s`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: MONO }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 10, color: T.faint, border: `1px solid ${T.line}`, borderRadius: 999, padding: "2px 6px" }}>
          {String(index).padStart(2, "0")}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}>
        <div className="bz-number" style={{ fontSize: 30, lineHeight: 1, fontWeight: 700, letterSpacing: "-0.035em", color: T.black, fontVariantNumeric: "tabular-nums", animationDelay: `${delay + 0.1}s` }}>
          {typeof value === "number" ? value.toLocaleString("en-US") : value}
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

/* ================= UI: Wizard Stepper ================= */
function WizardStepper({ current, onJump, disabled, labels }: {
  current: WizardStep; onJump: (s: WizardStep) => void; disabled: boolean;
  labels: { id: WizardStep; label: string; hint: string }[];
}) {
  return (
    <div className="bz-fade-up" style={{
      display: "flex", gap: 0, alignItems: "stretch", flexWrap: "wrap",
      background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16,
      overflow: "hidden", marginBottom: 20, animationDelay: ".1s",
    }}>
      {labels.map((s, i) => {
        const on = s.id === current;
        const done = s.id < current;
        return (
          <button key={s.id} type="button" disabled={disabled} onClick={() => onJump(s.id)}
            className="bz-seg"
            style={{
              flex: "1 1 200px", textAlign: "left",
              padding: "14px 18px", background: on ? T.black : "#fff",
              color: on ? "#fff" : T.black,
              border: "none", borderRight: i < labels.length - 1 ? `1px solid ${T.line}` : "none",
              display: "flex", alignItems: "center", gap: 12, minWidth: 0,
            }}
          >
            <span style={{
              width: 26, height: 26, borderRadius: 999,
              background: on ? "#fff" : done ? T.black : T.soft,
              color: on ? T.black : done ? "#fff" : T.muted,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, flexShrink: 0,
              border: `1px solid ${on ? "#fff" : done ? T.black : T.line}`,
            }}>
              {done ? "✓" : s.id}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{s.label}</div>
              <div style={{ fontFamily: MONO, fontSize: 10.5, opacity: 0.7, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.hint}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ================= UI: Toasts ================= */
function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 1000,
      display: "flex", flexDirection: "column", gap: 10, pointerEvents: "none", maxWidth: 380,
    }}>
      {toasts.map((toast) => {
        const icon = toast.tone === "ok" ? "✓" : toast.tone === "warn" ? "!" : toast.tone === "error" ? "✕" : "i";
        const bg = toast.tone === "error" ? T.black : toast.tone === "warn" ? T.gray700 : T.black;
        return (
          <div key={toast.id} className="bz-toast-in" style={{
            pointerEvents: "auto",
            background: T.surface, border: `1px solid ${T.black}`, borderRadius: 12,
            padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start",
            boxShadow: "0 18px 40px -22px rgba(0,0,0,.28)",
          }}>
            <span style={{
              width: 20, height: 20, borderRadius: 6, background: bg, color: "#fff",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, flexShrink: 0,
            }}>{icon}</span>
            <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: T.ink, fontFamily: MONO, flex: 1 }}>{toast.text}</p>
            <button type="button" onClick={() => onDismiss(toast.id)}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: T.muted, fontSize: 14, lineHeight: 1, padding: 0, marginTop: 2 }}
              aria-label="Dismiss">×</button>
          </div>
        );
      })}
    </div>
  );
}

/* ================= UI: Batch Progress ================= */
function BatchProgress({ info }: { info: BatchInfo }) {
  const total = Math.max(info.total, 1);
  const pct = Math.min(100, Math.round((info.current / total) * 100));
  const remaining = Math.max(0, total - info.current);
  const elapsedSec = (Date.now() - info.startedAt) / 1000;
  const perBatchSec = info.current > 0 ? elapsedSec / info.current : 2;
  const etaSec = Math.max(0, Math.round(remaining * perBatchSec));

  return (
    <div className="bz-fade-up" style={{
      background: T.surface, border: `1px solid ${T.black}`, borderRadius: 14,
      padding: "16px 18px", marginBottom: 20, display: "flex", flexDirection: "column", gap: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <span className="bz-spin" style={{ width: 14, height: 14, borderRadius: 999, border: `2px solid ${T.line}`, borderTopColor: T.black }} />
          <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.black }}>
            Batch {info.current} / {info.total}
          </span>
        </div>
        <span style={{ fontFamily: MONO, fontSize: 11.5, color: T.muted }}>
          {pct}% · {remaining > 0 ? `~${etaSec}s left` : "finishing…"}
        </span>
      </div>

      <div style={{ height: 8, background: T.soft, borderRadius: 999, overflow: "hidden" }}>
        <div className="bz-progress-fill" style={{
          width: `${pct}%`, height: "100%", background: T.black, borderRadius: 999,
          transition: "width .5s cubic-bezier(.2,.7,.2,1)",
        }} />
      </div>

      <div className="bz-grid-3" style={{ display: "grid", gap: 8 }}>
        {[{ label: "Sent", value: info.sent }, { label: "Failed", value: info.failed }, { label: "Remaining", value: remaining }].map((r) => (
          <div key={r.label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: T.muted, fontWeight: 600 }}>{r.label}</span>
            <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: T.black, fontVariantNumeric: "tabular-nums" }}>{r.value.toLocaleString("en-US")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= UI: Birthday Card ================= */
function BirthdayCard({ user, year, sending, onSend, delay = 0 }: {
  user: BirthdayUser; year: number; sending: boolean; onSend: () => void; delay?: number;
}) {
  const delivery = user.birthday_delivery;
  const initials = (user.display_name || user.first_name || user.email || "U").slice(0, 1).toUpperCase();
  const sentThisYear = delivery?.status === "sent";

  return (
    <article className="bz-fade-up" style={{
      background: T.surface,
      border: `1px solid ${user.is_today ? T.black : T.line}`,
      borderRadius: 14,
      padding: 18,
      display: "flex",
      flexDirection: "column",
      gap: 14,
      minWidth: 0,
      animationDelay: `${delay}s`,
      transition: "transform .2s ease, border-color .2s ease, box-shadow .2s ease",
    }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        {user.profile_photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.profile_photo_url} alt=""
            style={{ width: 44, height: 44, borderRadius: 12, objectFit: "cover", flexShrink: 0, border: `1px solid ${T.line}` }} />
        ) : (
          <span style={{
            width: 44, height: 44, borderRadius: 12, background: T.black, color: "#fff",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 700, flexShrink: 0,
          }}>{initials}</span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
            <strong style={{ fontSize: 14, color: T.black, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 650 }}>
              {user.display_name || "Unnamed user"}
            </strong>
            {user.is_today && (
              <span style={{
                fontSize: 9.5, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700,
                fontFamily: MONO, color: "#fff", background: T.black, border: `1px solid ${T.black}`,
                borderRadius: 999, padding: "3px 9px", flexShrink: 0,
              }}>Today</span>
            )}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: T.muted, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user.email || "No email"}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10.5, color: T.faint, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user.binzeo_user_id}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, paddingTop: 10, borderTop: `1px solid ${T.line}` }}>
        {[
          { label: "Birthday", value: user.birth_date || "—" },
          { label: "Age", value: user.age ?? "—" },
          { label: `${year}`, value: delivery?.status || "Not sent" },
        ].map((m) => (
          <div key={m.label} style={{ minWidth: 0 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: T.muted, fontWeight: 600 }}>
              {m.label}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 700, color: T.black, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={String(m.value)}>
              {m.value}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={!user.email || sending || sentThisYear}
        onClick={onSend}
        className={sentThisYear ? "bz-btn-ghost" : "bz-btn"}
        style={{
          padding: "10px 14px",
          border: `1px solid ${sentThisYear ? T.line : T.black}`,
          borderRadius: 10,
          background: sentThisYear ? "#fff" : T.black,
          color: sentThisYear ? T.muted : "#fff",
          fontFamily: MONO, fontSize: 11.5, fontWeight: 700,
          letterSpacing: "0.06em", textTransform: "uppercase",
          width: "100%",
        }}
      >
        {sending ? "Sending…" : sentThisYear ? "✓ Sent this year" : "Send birthday email"}
      </button>
    </article>
  );
}

/* ================= PAGE ================= */
export default function BirthdaysPage() {
  const [users, setUsers] = useState<BirthdayUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [today, setToday] = useState("");
  const [audienceTruncated, setAudienceTruncated] = useState(false);
  const [year, setYear] = useState(new Date().getUTCFullYear());
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Loading birthday profiles…");
  const [sending, setSending] = useState<string | null>(null);
  const [bulkSending, setBulkSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ sent: number; failed: number; skipped: number } | null>(null);
  const [batchInfo, setBatchInfo] = useState<BatchInfo | null>(null);
  const [cancelling, setCancelling] = useState(false);

  /* wizard + ui */
  const [step, setStep] = useState<WizardStep>(1);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastSeq = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const pushToast = useCallback((text: string, tone: Toast["tone"] = "info") => {
    const id = ++toastSeq.current;
    setToasts((cur) => [...cur, { id, text, tone }]);
    setTimeout(() => setToasts((cur) => cur.filter((t) => t.id !== id)), 6000);
  }, []);
  const dismissToast = (id: number) => setToasts((cur) => cur.filter((t) => t.id !== id));

  async function load() {
    const response = await fetch("/api/admin/birthdays", { cache: "no-store" });
    const json = await response.json();
    if (!response.ok) { setStatus(json.error?.message ?? "Birthday data could not be loaded."); return; }
    const data = json.data ?? json;
    setUsers(data.users ?? []);
    setToday(data.today ?? "");
    setAudienceTruncated(Boolean(data.audience_truncated));
    setYear(data.year ?? year);
    setStatus("");
  }

  useEffect(() => {
    fetch("/api/admin/birthdays", { cache: "no-store" }).then(async (response) => {
      const json = await response.json();
      if (!response.ok) { setStatus(json.error?.message ?? "Birthday data could not be loaded."); return; }
      const data = json.data ?? json;
      setUsers(data.users ?? []);
      setToday(data.today ?? "");
      setAudienceTruncated(Boolean(data.audience_truncated));
      setYear(data.year ?? new Date().getUTCFullYear());
      setStatus("");
    }).catch(() => setStatus("Birthday data could not be loaded."));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Escape cancels bulk */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && bulkSending && !cancelling && abortRef.current) {
        setCancelling(true);
        abortRef.current.abort();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bulkSending, cancelling]);

  /* ---------- derived ---------- */
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return users.filter((user) => !needle || `${user.display_name ?? ""} ${user.email ?? ""} ${user.binzeo_user_id}`.toLowerCase().includes(needle));
  }, [users, search]);

  const todayUsers = useMemo(() => users.filter((user) => user.is_today), [users]);

  const sentThisYear = users.filter((u) => u.birthday_delivery?.status === "sent").length;
  const pendingThisYear = users.length - sentThisYear;

  /* status donut for the year */
  const statusSegments = useMemo(() => {
    const segs = [
      { label: "Sent", value: sentThisYear },
      { label: "Pending", value: pendingThisYear },
    ].filter((s) => s.value > 0);
    return segs;
  }, [sentThisYear, pendingThisYear]);

  /* age distribution */
  const ageSegments = useMemo(() => {
    const map = new Map<string, number>();
    users.forEach((u) => {
      if (!u.age) return;
      const bucket = `${Math.floor(u.age / 10) * 10}s`;
      map.set(bucket, (map.get(bucket) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [users]);

  /* KPIs */
  const kpis = [
    { label: "Eligible profiles", value: users.length, detail: audienceTruncated ? "Capped at 1,000" : "All opted-in active users" },
    { label: "Birthdays today", value: todayUsers.length, detail: todayUsers.length > 0 ? "Ready to send" : "None today" },
    { label: "Year", value: year, detail: "One-send annual guard" },
    { label: "Sent this year", value: sentThisYear, detail: `${pendingThisYear} still pending` },
  ];

  /* step readiness */
  const canContinueFromStep1 = true;
  const canContinueFromStep2 = true;
  const canBulkSend = selectedUsers.length > 0 && !bulkSending && sending === null;

  /* wizard step labels */
  const wizardLabels: { id: WizardStep; label: string; hint: string }[] = [
    { id: 1, label: "Today", hint: "Send to today's birthdays" },
    { id: 2, label: "Directory", hint: "Browse all profiles" },
    { id: 3, label: "Bulk send", hint: "Filter, select & send" },
  ];

  /* ---------- send single ---------- */
  async function sendBirthday(user: BirthdayUser) {
    if (!user.email) { setStatus("This user has no email address."); pushToast("No email address on file.", "warn"); return; }
    if (!window.confirm(`Send the ${year} birthday email to ${user.display_name || user.email}?`)) return;
    setSending(user.id);
    setStatus("");
    try {
      const response = await fetch("/api/admin/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send", template: "birthday",
          selected_user_ids: [user.id],
          subject: "Happy Birthday from BINZEO",
          preheader: "A special birthday wish from BINZEO.",
          headline: "Happy Birthday",
          message: "",
          button_label: "Open your BINZEO profile",
          button_url: "https://auth-binzeo.vercel.app/dashboard/profile",
          theme: "dark", team_ids: [], images: [],
        }),
      });
      const json = await response.json();
      const data = json.data ?? json;
      if (response.ok && data.sent) {
        setStatus(`Birthday email sent to ${user.display_name || user.email}.`);
        pushToast(`Birthday wish sent to ${user.display_name || user.email}.`, "ok");
      } else if (response.ok) {
        setStatus(`Not sent: ${data.skipped ? "already sent this year" : "delivery failed"}.`);
        pushToast(`Not sent · ${data.skipped ? "already sent this year" : "delivery failed"}.`, "warn");
      } else {
        const message = json.error?.message ?? "Birthday email failed.";
        setStatus(message);
        pushToast(message, "error");
      }
      await load();
    } catch {
      setStatus("Birthday send did not complete. Check delivery history before retrying.");
      pushToast("Send request did not complete.", "error");
    } finally {
      setSending(null);
    }
  }

  /* ---------- cancel bulk ---------- */
  function cancelBulk() {
    if (abortRef.current) {
      setCancelling(true);
      abortRef.current.abort();
    }
  }

  /* ---------- bulk send ---------- */
  async function sendBirthdayBulk() {
    if (!selectedUsers.length) { setStatus("Select at least one eligible recipient."); pushToast("Select at least one recipient.", "warn"); return; }
    const selectedCount = selectedUsers.length;
    if (!window.confirm(`Send this year's birthday wish to ${selectedCount} selected user(s)? Users already sent a birthday email this year will be skipped.`)) return;

    setBulkSending(true);
    setLastResult(null);
    setBatchInfo(null);
    setCancelling(false);
    setStatus("");
    pushToast(`Started sending birthday wishes to ${selectedCount} recipient(s).`, "info");

    const controller = new AbortController();
    abortRef.current = controller;

    let sent = 0, failed = 0, skipped = 0;
    let wasAborted = false;
    const startedAt = Date.now();

    const batches = Array.from({ length: Math.ceil(selectedUsers.length / BATCH_SIZE) }, (_, index) => selectedUsers.slice(index * BATCH_SIZE, (index + 1) * BATCH_SIZE));
    setBatchInfo({ current: 0, total: batches.length, sent: 0, failed: 0, startedAt });

    try {
      for (let index = 0; index < batches.length; index += 1) {
        if (controller.signal.aborted) { wasAborted = true; break; }
        const batch = batches[index];
        setBatchInfo({ current: index + 1, total: batches.length, sent, failed, startedAt });
        setStatus(`Sending birthday batch ${index + 1} of ${batches.length} (${sent} sent so far)…`);

        const response = await fetch("/api/admin/marketing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "send", template: "birthday",
            selected_user_ids: batch,
            subject: "Happy Birthday from BINZEO",
            preheader: "A special birthday wish from BINZEO.",
            headline: "Happy Birthday",
            message: "",
            button_label: "Open your BINZEO profile",
            button_url: "https://auth-binzeo.vercel.app/dashboard/profile",
            theme: "dark", team_ids: [], images: [],
          }),
          signal: controller.signal,
        });
        const json = await response.json();
        const data = json.data ?? json;
        if (!response.ok) throw new Error(json.error?.message ?? "Birthday batch failed.");
        sent += Number(data.sent ?? 0);
        failed += Number(data.failed ?? 0);
        skipped += Number(data.skipped ?? 0);
        setBatchInfo({ current: index + 1, total: batches.length, sent, failed, startedAt });
        setSelectedUsers((current) => current.filter((id) => !batch.includes(id)));
      }

      await load();
      if (wasAborted) {
        setStatus(`Cancelled after ${sent} sent, ${failed} failed and ${skipped} skipped. Remaining recipients were not contacted.`);
        pushToast(`Cancelled · ${sent} sent, ${failed} failed, ${skipped} skipped.`, "warn");
      } else {
        setStatus(`Birthday emails complete: ${sent} sent, ${failed} failed, ${skipped} skipped for ${year}.`);
        pushToast(`Complete · ${sent} sent, ${failed} failed, ${skipped} skipped.`, failed > 0 ? "warn" : "ok");
      }
      setLastResult({ sent, failed, skipped });
    } catch (error) {
      const isAbort = error instanceof DOMException && error.name === "AbortError";
      if (isAbort) {
        setStatus(`Cancelled after ${sent} sent, ${failed} failed and ${skipped} skipped. Remaining recipients were not contacted.`);
        pushToast(`Cancelled · ${sent} sent, ${failed} failed.`, "warn");
      } else {
        const message = error instanceof Error ? error.message : "The send request did not complete.";
        setStatus(`Stopped after ${sent} sent, ${failed} failed and ${skipped} skipped. ${message} Check campaign delivery records before retrying.`);
        pushToast(`Stopped · ${message}`, "error");
      }
      setLastResult({ sent, failed, skipped });
    } finally {
      abortRef.current = null;
      setBulkSending(false);
      setCancelling(false);
      setBatchInfo(null);
    }
  }

  const loading = status.startsWith("Loading");
  const lastDelivery = users
    .map((u) => u.birthday_delivery?.sent_at)
    .filter((t): t is string => Boolean(t))
    .reduce<string | null>((acc, t) => (!acc || t > acc ? t : acc), null);

  return (
    <div style={{ background: T.canvas, minHeight: "100%", padding: "32px clamp(20px, 4vw, 48px) 160px", color: T.ink, fontFamily: SANS }}>
      <style>{ANIM_CSS}</style>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* ============ BREADCRUMB ============ */}
      <nav style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontFamily: MONO, fontSize: 11.5, color: T.muted }}>
        <Link href="/dashboard" style={{ color: T.muted, textDecoration: "none" }}>Control room</Link>
        <span style={{ color: T.faint }}>/</span>
        <Link href="/dashboard/marketing" style={{ color: T.muted, textDecoration: "none" }}>Communications</Link>
        <span style={{ color: T.faint }}>/</span>
        <span style={{ color: T.black, fontWeight: 600 }}>Birthdays</span>
      </nav>

      {/* ============ HERO ============ */}
      <header className="bz-fade-up" style={{
        display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "space-between", alignItems: "flex-start",
        padding: 24, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, marginBottom: 20,
        animationDelay: ".05s",
      }}>
        <div style={{ maxWidth: 720, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ width: 26, height: 26, borderRadius: 8, background: T.black, color: "#fff",
              display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>B</span>
            <span style={{ fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: MONO }}>
              Communications · Annual wishes
            </span>
          </div>
          <h1 style={{ margin: "0 0 10px", fontSize: "clamp(26px, 3.2vw, 38px)", lineHeight: 1.05, fontWeight: 700, letterSpacing: "-0.035em", color: T.black }}>
            User birthdays
          </h1>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: T.muted, maxWidth: 660 }}>
            Every active user with marketing consent, their profile, birthday, current age and this year&apos;s delivery status. One-send annual guard is always active.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" }}>
          <Link href="/dashboard/templates" className="bz-btn-ghost" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            fontSize: 12, fontWeight: 600, fontFamily: MONO, letterSpacing: "0.04em",
            color: T.black, background: "#fff", border: `1px solid ${T.black}`,
            borderRadius: 999, padding: "8px 16px",
          }}>
            ✎ View saved template
          </Link>
          <span style={{ fontFamily: MONO, fontSize: 11.5, color: T.faint }}>
            {users.length.toLocaleString("en-US")} profiles · {sentThisYear} sent · {pendingThisYear} pending
          </span>
        </div>
      </header>

      {/* ============ WIZARD STEPPER ============ */}
      <WizardStepper current={step} onJump={setStep} disabled={bulkSending || sending !== null} labels={wizardLabels} />

      {/* ============ KPI STRIP ============ */}
      <section style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 600, color: T.muted, fontFamily: MONO }}>
            Birthday overview
          </h2>
          <span style={{ fontFamily: MONO, fontSize: 11.5, color: T.faint }}>
            {lastDelivery ? `last send · ${ago(lastDelivery)}` : "no sends yet"} · {today || "date unavailable"}
          </span>
        </div>
        <div className="bz-grid-kpi" style={{ display: "grid", gap: 12 }}>
          {kpis.map((k, i) => (
            <KPICard key={k.label} index={i + 1} label={k.label} value={k.value} detail={k.detail} delay={0.05 * i} />
          ))}
        </div>
      </section>

      {/* ============ BATCH PROGRESS ============ */}
      {batchInfo && <BatchProgress info={batchInfo} />}

      {/* ============ STATUS BANNER ============ */}
      {status && !batchInfo && (
        <div className="bz-fade-up" role="status" style={{
          display: "flex", alignItems: "flex-start", gap: 12,
          padding: "14px 18px", marginBottom: 20,
          background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12,
          animationDelay: ".25s",
        }}>
          {bulkSending || loading || sending !== null ? (
            <span className="bz-spin" style={{
              width: 14, height: 14, borderRadius: 999,
              border: `2px solid ${T.line}`, borderTopColor: T.black,
              flexShrink: 0, marginTop: 2,
            }} />
          ) : (
            <span style={{
              width: 20, height: 20, borderRadius: 6, background: T.black, color: "#fff",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, flexShrink: 0,
            }}>i</span>
          )}
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: T.ink, fontFamily: MONO }}>{status}</p>
        </div>
      )}

      {/* ============ RESULT SUMMARY ============ */}
      {lastResult && !bulkSending && (
        <section className="bz-grid-3" style={{ display: "grid", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Sent", value: lastResult.sent, tone: "ok" as const },
            { label: "Failed", value: lastResult.failed, tone: lastResult.failed > 0 ? "warn" as const : "ok" as const },
            { label: "Skipped", value: lastResult.skipped, tone: lastResult.skipped > 0 ? "warn" as const : "ok" as const },
          ].map((r, i) => (
            <div key={r.label} className="bz-fade-up" style={{
              background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14,
              padding: "16px 18px", display: "flex", flexDirection: "column", gap: 6,
              animationDelay: `${0.05 * i}s`,
            }}>
              <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: T.muted, fontWeight: 600 }}>{r.label}</span>
              <span className="bz-number" style={{ fontSize: 30, lineHeight: 1, fontWeight: 700, color: T.black, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", animationDelay: `${0.1 + i * 0.05}s` }}>
                {r.value.toLocaleString("en-US")}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: MONO, fontSize: 11, color: T.muted }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: r.tone === "warn" ? T.gray700 : T.black }} />
                bulk result
              </span>
            </div>
          ))}
        </section>
      )}

      {/* ============ STEP 1: TODAY ============ */}
      {step === 1 && (
        <section style={{ marginBottom: 16 }}>
          <Panel
            eyebrow="Step 1 · Today"
            title={todayUsers.length > 0 ? `Today's birthdays · ${todayUsers.length}` : "No birthdays today"}
            delay={0.3}
            action={
              <span style={{
                fontFamily: MONO, fontSize: 11, fontWeight: 600, color: T.black,
                background: "#fff", border: `1px solid ${T.line}`, borderRadius: 999, padding: "4px 10px",
              }}>
                {today || "—"} UTC
              </span>
            }
          >
            {todayUsers.length === 0 ? (
              <div style={{
                padding: "48px 24px", textAlign: "center",
                border: `1px dashed ${T.line}`, borderRadius: 12, background: T.canvas,
              }}>
                <p style={{ margin: 0, fontFamily: MONO, fontSize: 12.5, color: T.muted }}>
                  No active birthdays fall on today&apos;s UTC date. Use the Directory or Bulk send steps to send wishes to other profiles.
                </p>
              </div>
            ) : (
              <div className="bz-grid-cards" style={{ display: "grid", gap: 14 }}>
                {todayUsers.map((user, i) => (
                  <BirthdayCard
                    key={user.id}
                    user={user}
                    year={year}
                    sending={bulkSending || sending === user.id}
                    onSend={() => void sendBirthday(user)}
                    delay={0.35 + i * 0.04}
                  />
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 12, borderTop: `1px solid ${T.line}` }}>
              <button type="button" className="bz-btn" onClick={() => setStep(2)}
                style={{
                  padding: "11px 20px", background: T.black, color: "#fff",
                  border: `1px solid ${T.black}`, borderRadius: 10,
                  fontFamily: MONO, fontSize: 12, fontWeight: 700,
                  letterSpacing: "0.06em", textTransform: "uppercase",
                }}>
                Continue → Directory
              </button>
            </div>
          </Panel>
        </section>
      )}

      {/* ============ STEP 2: DIRECTORY ============ */}
      {step === 2 && (
        <section style={{ marginBottom: 16 }}>
          <Panel
            eyebrow="Step 2 · Directory"
            title={`All birthday profiles · ${filtered.length}`}
            delay={0.3}
            action={
              <span style={{
                fontFamily: MONO, fontSize: 11, fontWeight: 600, color: T.black,
                background: "#fff", border: `1px solid ${T.line}`, borderRadius: 999, padding: "4px 10px",
              }}>
                {sentThisYear} sent · {pendingThisYear} pending
              </span>
            }
          >
            <div className="bz-grid-filter" style={{ display: "grid", gap: 10, marginBottom: 6 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: "span 2" }}>
                <label style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: T.muted, fontWeight: 600 }}>
                  Search
                </label>
                <input
                  className="bz-input"
                  placeholder="Search name, email or BINZEO ID"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  disabled={bulkSending || sending !== null}
                  style={{
                    padding: "11px 14px", fontSize: 13,
                    border: `1px solid ${T.line}`, borderRadius: 10,
                    background: "#fff", color: T.black, fontFamily: SANS,
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, justifyContent: "flex-end" }}>
                {search && (
                  <button type="button" onClick={() => setSearch("")} className="bz-btn-ghost"
                    style={{
                      padding: "8px 12px", border: `1px solid ${T.line}`, borderRadius: 10,
                      background: "#fff", color: T.black, fontFamily: MONO, fontSize: 11, fontWeight: 600,
                      alignSelf: "flex-end",
                    }}>
                    ✕ Reset search
                  </button>
                )}
              </div>
            </div>

            <div className="bz-grid-cards" style={{ display: "grid", gap: 14 }}>
              {filtered.map((user, i) => (
                <BirthdayCard
                  key={user.id}
                  user={user}
                  year={year}
                  sending={bulkSending || sending === user.id}
                  onSend={() => void sendBirthday(user)}
                  delay={0.35 + Math.min(i, 12) * 0.03}
                />
              ))}
              {!filtered.length && (
                <div style={{
                  gridColumn: "1 / -1",
                  padding: "40px 24px", textAlign: "center",
                  border: `1px dashed ${T.line}`, borderRadius: 12, background: T.canvas,
                  fontFamily: MONO, fontSize: 12.5, color: T.muted,
                }}>
                  {loading ? "Loading profiles…" : "No birthday profiles match your search."}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: `1px solid ${T.line}`, flexWrap: "wrap" }}>
              <button type="button" className="bz-btn-ghost" onClick={() => setStep(1)} disabled={bulkSending || sending !== null}
                style={{
                  padding: "11px 18px", border: `1px solid ${T.line}`, borderRadius: 10,
                  background: "#fff", color: T.black, fontFamily: MONO, fontSize: 12, fontWeight: 600,
                }}>
                ← Back to today
              </button>
              <button type="button" className="bz-btn" disabled={!canContinueFromStep2} onClick={() => setStep(3)}
                style={{
                  padding: "11px 20px", background: T.black, color: "#fff",
                  border: `1px solid ${T.black}`, borderRadius: 10,
                  fontFamily: MONO, fontSize: 12, fontWeight: 700,
                  letterSpacing: "0.06em", textTransform: "uppercase",
                }}>
                Continue → Bulk send
              </button>
            </div>
          </Panel>
        </section>
      )}

      {/* ============ STEP 3: BULK SEND ============ */}
      {step === 3 && (
        <section className="bz-grid-2" style={{ display: "grid", gap: 16, marginBottom: 16 }}>
          <Panel
            eyebrow="Step 3 · Bulk send"
            title="Filter and select recipients"
            delay={0.3}
            action={
              <span style={{
                fontFamily: MONO, fontSize: 11, fontWeight: 600, color: T.black,
                background: "#fff", border: `1px solid ${T.line}`, borderRadius: 999, padding: "4px 10px",
              }}>
                {selectedUsers.length > 0 ? `${selectedUsers.length} selected` : `${users.length} eligible`}
              </span>
            }
          >
            <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: T.muted }}>
              Filter by age, country, language or account-creation date. One click sends the selected recipients in batches of {BATCH_SIZE}; annual duplicate protection remains active.
            </p>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button type="button" disabled={bulkSending || users.length === 0}
                onClick={() => setSelectedUsers(users.filter((u) => u.birthday_delivery?.status !== "sent").map((u) => u.id))}
                className="bz-chip"
                style={{
                  padding: "7px 12px", borderRadius: 999, border: `1px solid ${T.line}`,
                  background: "#fff", color: T.black, fontFamily: MONO, fontSize: 11, fontWeight: 600,
                }}>
                All pending · {pendingThisYear}
              </button>
              <button type="button" disabled={bulkSending || users.length === 0}
                onClick={() => setSelectedUsers(users.map((u) => u.id))}
                className="bz-chip"
                style={{
                  padding: "7px 12px", borderRadius: 999, border: `1px solid ${T.line}`,
                  background: "#fff", color: T.black, fontFamily: MONO, fontSize: 11, fontWeight: 600,
                }}>
                All · {users.length}
              </button>
              <button type="button" disabled={bulkSending || selectedUsers.length === 0}
                onClick={() => setSelectedUsers([])}
                className="bz-chip"
                style={{
                  padding: "7px 12px", borderRadius: 999, border: `1px solid ${T.line}`,
                  background: "#fff", color: T.black, fontFamily: MONO, fontSize: 11, fontWeight: 600,
                }}>
                Clear
              </button>
            </div>

            {audienceTruncated && (
              <div className="bz-fade-up" style={{
                display: "flex", gap: 10, alignItems: "flex-start",
                padding: "12px 14px", border: `1px solid ${T.black}`, borderRadius: 12,
                background: T.canvas,
              }}>
                <span style={{
                  width: 18, height: 18, borderRadius: 6, background: T.black, color: "#fff",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>!</span>
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: T.ink, fontFamily: MONO }}>
                  The eligible audience reached the current 1,000-profile list limit; only the first 1,000 birthday profiles are shown.
                </p>
              </div>
            )}

            <EmailRecipientSelector
              users={users}
              selectedIds={selectedUsers}
              onSelectedIdsChange={setSelectedUsers}
              disabled={bulkSending || sending !== null}
            />

            <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: `1px solid ${T.line}`, flexWrap: "wrap" }}>
              <button type="button" className="bz-btn-ghost" onClick={() => setStep(2)} disabled={bulkSending}
                style={{
                  padding: "11px 18px", border: `1px solid ${T.line}`, borderRadius: 10,
                  background: "#fff", color: T.black, fontFamily: MONO, fontSize: 12, fontWeight: 600,
                }}>
                ← Back to directory
              </button>
              <button type="button" className={bulkSending ? "bz-btn-danger" : "bz-btn"}
                onClick={bulkSending ? cancelBulk : () => void sendBirthdayBulk()}
                disabled={!bulkSending && !canBulkSend}
                style={{
                  padding: "12px 22px",
                  background: bulkSending ? "#fff" : T.black,
                  color: bulkSending ? T.black : "#fff",
                  border: `1px solid ${T.black}`, borderRadius: 10,
                  fontFamily: MONO, fontSize: 12.5, fontWeight: 700,
                  letterSpacing: "0.06em", textTransform: "uppercase",
                }}>
                {bulkSending ? (cancelling ? "Cancelling…" : "✕ Cancel send (Esc)") : "Send birthday wishes now"}
              </button>
            </div>
          </Panel>

          <Panel eyebrow="Insights" title="Year-to-date delivery" delay={0.35}>
            {users.length === 0 ? (
              <div style={{ padding: 26, textAlign: "center", fontSize: 12, color: T.muted, fontFamily: MONO }}>No profiles loaded</div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <Donut segments={statusSegments} size={170} centerLabel={`${year}`} centerValue={users.length} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                  {statusSegments.map((s, i) => (
                    <div key={s.label} className="bz-fade-up" style={{ display: "flex", alignItems: "center", gap: 8, animationDelay: `${0.4 + i * 0.05}s` }}>
                      <span style={{ width: 9, height: 9, borderRadius: 3, background: SHADES[i % SHADES.length], flexShrink: 0 }} />
                      <span style={{ fontFamily: MONO, fontSize: 11.5, color: T.ink, flex: 1, textTransform: "uppercase" }}>{s.label}</span>
                      <span style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 700, color: T.black }}>{s.value}</span>
                    </div>
                  ))}
                </div>

                {ageSegments.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <p style={{ margin: "0 0 8px", fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", color: T.muted, fontWeight: 600 }}>
                      Age distribution
                    </p>
                    <HBars segments={ageSegments.map((a) => ({
                      label: a.label,
                      value: a.value,
                      sub: `${Math.round((a.value / Math.max(users.length, 1)) * 100)}%`,
                    }))} />
                  </div>
                )}
              </>
            )}
          </Panel>
        </section>
      )}

      {/* ============ ANALYTICS (not on step 3) ============ */}
      {step !== 3 && (
        <section className="bz-grid-3" style={{ display: "grid", gap: 16, marginBottom: 16 }}>
          <Panel eyebrow="Delivery" title={`${year} overview`} delay={0.4}>
            {statusSegments.length === 0 ? (
              <div style={{ padding: 26, textAlign: "center", fontSize: 12, color: T.muted, fontFamily: MONO }}>No delivery data</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <Donut segments={statusSegments} size={170} centerLabel={`${year}`} centerValue={users.length} />
                <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                  {statusSegments.map((s, i) => (
                    <div key={s.label} className="bz-fade-up" style={{ display: "flex", alignItems: "center", gap: 8, animationDelay: `${0.45 + i * 0.05}s` }}>
                      <span style={{ width: 9, height: 9, borderRadius: 3, background: SHADES[i % SHADES.length], flexShrink: 0 }} />
                      <span style={{ fontFamily: MONO, fontSize: 11.5, color: T.ink, flex: 1, textTransform: "uppercase" }}>{s.label}</span>
                      <span style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 700, color: T.black }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Panel>

          <Panel eyebrow="Age mix" title="Age distribution" delay={0.45}
            action={<span style={{ fontFamily: MONO, fontSize: 11, color: T.muted, border: `1px solid ${T.line}`, borderRadius: 999, padding: "4px 10px" }}>{ageSegments.length} buckets</span>}>
            {ageSegments.length === 0 ? (
              <div style={{ padding: 26, textAlign: "center", fontSize: 12, color: T.muted, fontFamily: MONO }}>No age data</div>
            ) : (
              <HBars segments={ageSegments.map((a) => ({
                label: a.label,
                value: a.value,
                sub: `${Math.round((a.value / Math.max(users.length, 1)) * 100)}%`,
              }))} />
            )}
          </Panel>

          <Panel eyebrow="Readiness" title="Pre-send checklist" delay={0.5}>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {[
                { label: "Template", ok: true, detail: "Default BINZEO birthday" },
                { label: "Year guard", ok: true, detail: `1 send / user / ${year}` },
                { label: "Today", ok: todayUsers.length > 0, detail: `${todayUsers.length} birthday(s) today` },
                { label: "Pending", ok: pendingThisYear > 0, detail: `${pendingThisYear} still unsent` },
                { label: "Audience cap", ok: !audienceTruncated, detail: audienceTruncated ? "reached 1,000 limit" : "within limit" },
              ].map((r, i) => (
                <li key={r.label} className="bz-fade-up" style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
                  padding: "10px 0", borderBottom: `1px solid ${T.line}`,
                  animationDelay: `${0.55 + i * 0.04}s`,
                }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span style={{
                      width: 16, height: 16, borderRadius: 999,
                      background: r.ok ? T.black : "#fff", border: `1px solid ${T.black}`,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      color: r.ok ? "#fff" : T.black, fontSize: 10, fontWeight: 700, flexShrink: 0,
                    }}>{r.ok ? "✓" : "·"}</span>
                    <span style={{ fontFamily: MONO, fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{r.label}</span>
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: T.black, textAlign: "right", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>
                    {r.detail}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </section>
      )}

      {/* ============ PROTECTED NOTE ============ */}
      <section style={{ marginBottom: 24 }}>
        <div className="bz-fade-up" style={{
          padding: "14px 18px", border: `1px solid ${T.line}`, borderRadius: 12, background: T.surface,
          display: "flex", gap: 12, alignItems: "flex-start", animationDelay: ".6s",
        }}>
          <span style={{
            width: 20, height: 20, borderRadius: 6, background: T.black, color: "#fff",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, flexShrink: 0,
          }}>i</span>
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.65, color: T.muted, fontFamily: MONO }}>
            <strong style={{ color: T.black }}>Saved template:</strong>{" "}
            <Link href="/dashboard/templates" style={{ color: T.black, textDecoration: "underline", textUnderlineOffset: 3 }}>
              open the central email template library
            </Link>{" "}
            to view or edit the birthday design. This section only sends wishes. If no custom version exists, the default BINZEO template is used.{" "}
            <strong style={{ color: T.black }}>Duplicate protection:</strong> the database allows only one{" "}
            <code style={{ fontFamily: MONO, background: T.canvas, padding: "1px 6px", borderRadius: 4, border: `1px solid ${T.line}` }}>birthday_email_deliveries</code>{" "}
            record per user per year. Automatic daily processing and this manual button use the same guard.
          </p>
        </div>
      </section>

      {/* ============ STICKY ACTION BAR ============ */}
      {canBulkSend && !bulkSending && (
        <div className="bz-fade-up" style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 800,
          background: T.surface, borderTop: `1px solid ${T.line}`,
          padding: "14px clamp(20px, 4vw, 48px)",
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap",
          boxShadow: "0 -12px 32px -22px rgba(0,0,0,.24)",
          animationDelay: ".6s",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flexWrap: "wrap" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              fontFamily: MONO, fontSize: 11.5, fontWeight: 700,
              color: "#fff", background: T.black, border: `1px solid ${T.black}`,
              borderRadius: 999, padding: "6px 12px",
            }}>
              <span className="bz-pulse" style={{ width: 6, height: 6, borderRadius: 999, background: "#fff" }} />
              Ready to send
            </span>
            <span style={{ fontFamily: MONO, fontSize: 12, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              Birthday wishes · {selectedUsers.length} recipient{selectedUsers.length === 1 ? "" : "s"} · {year}
            </span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="bz-btn-ghost" onClick={() => setStep(3)} disabled={bulkSending}
              style={{
                padding: "10px 16px", border: `1px solid ${T.line}`, borderRadius: 10,
                background: "#fff", color: T.black, fontFamily: MONO, fontSize: 12, fontWeight: 600,
              }}>
              Edit
            </button>
            <button type="button" className="bz-btn" onClick={() => void sendBirthdayBulk()}
              style={{
                padding: "10px 20px", background: T.black, color: "#fff",
                border: `1px solid ${T.black}`, borderRadius: 10,
                fontFamily: MONO, fontSize: 12, fontWeight: 700,
                letterSpacing: "0.06em", textTransform: "uppercase",
              }}>
              Send now
            </button>
          </div>
        </div>
      )}

      {/* ============ FOOTER ============ */}
      <footer style={{
        marginTop: 40, paddingTop: 20, borderTop: `1px solid ${T.line}`,
        display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "center",
        fontFamily: MONO, fontSize: 11, color: T.faint, letterSpacing: "0.04em",
      }}>
        <span>BINZEO ADMIN CONSOLE — BIRTHDAYS v2.0 · WIZARD</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span className="bz-pulse" style={{ width: 6, height: 6, borderRadius: 999, background: T.black }} />
          {users.length.toLocaleString("en-US")} PROFILES · {sentThisYear} SENT · {pendingThisYear} PENDING · ESC TO CANCEL
        </span>
      </footer>
    </div>
  );
}
