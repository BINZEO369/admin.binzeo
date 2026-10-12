"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EmailRecipientSelector, { type EmailRecipient } from "@/components/EmailRecipientSelector";

type User = EmailRecipient;
type Team = { id: string; sector_name: string };
type Template = { id: string; name: string; template_type: "birthday" | "marketing" | "occasion"; theme: string };
type Toast = { id: number; text: string; tone: "info" | "ok" | "warn" | "error" };
type BatchInfo = { current: number; total: number; sent: number; failed: number; skipped: number; startedAt: number };
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
  @keyframes bzModalIn { from { opacity: 0; transform: scale(.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }

  .bz-spark-line { stroke-dasharray: 500; stroke-dashoffset: 500; animation: bzDraw 1s cubic-bezier(.4,0,.2,1) forwards; }
  .bz-spark-area { opacity: 0; animation: bzFadeIn .7s ease-out .3s forwards; }
  .bz-spark-dot { transform-box: fill-box; transform-origin: center; opacity: 0; animation: bzPop .35s ease-out 1s forwards; }
  .bz-hbar { transform-box: fill-box; transform-origin: left; transform: scaleX(0); animation: bzGrowX .9s cubic-bezier(.2,.7,.2,1) forwards; }
  .bz-donut-seg { opacity: 0; animation: bzFadeIn .8s ease-out forwards; }
  .bz-fade-up { opacity: 0; animation: bzRiseUp .55s cubic-bezier(.2,.7,.2,1) forwards; }
  .bz-number { display: inline-block; opacity: 0; animation: bzRiseUp .5s ease-out forwards; }
  .bz-toast-in { animation: bzSlideInRight .35s cubic-bezier(.2,.7,.2,1) forwards; }
  .bz-modal-in { animation: bzModalIn .3s cubic-bezier(.2,.7,.2,1) forwards; }
  .bz-pulse { animation: bzPulse 2.2s ease-in-out infinite; }
  .bz-spin { animation: bzSpin .9s linear infinite; }

  .bz-card { transition: transform .22s cubic-bezier(.2,.7,.2,1), border-color .22s ease, box-shadow .22s ease; }
  .bz-card:hover { transform: translateY(-2px); border-color: ${T.black}; box-shadow: 0 14px 32px -22px rgba(0,0,0,.24); }

  .bz-team, .bz-seg, .bz-chip { transition: background .18s ease, color .18s ease, border-color .18s ease; cursor: pointer; user-select: none; }
  .bz-team:hover:not(:disabled), .bz-seg:hover:not(:disabled), .bz-chip:hover:not(:disabled) { border-color: ${T.black} !important; }
  .bz-team.on, .bz-seg.on, .bz-chip.on { background: ${T.black} !important; color: #fff !important; border-color: ${T.black} !important; }
  .bz-team.on .bz-team-dot { background: #fff !important; }
  .bz-team:disabled, .bz-seg:disabled, .bz-chip:disabled { opacity: .42; cursor: not-allowed; }

  .bz-select { appearance: none; -webkit-appearance: none;
    background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='none' stroke='%23737373' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' d='M1 1.5l5 5 5-5'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 14px center; padding-right: 34px !important; cursor: pointer; }
  .bz-select:focus { outline: none; border-color: ${T.black} !important; box-shadow: 0 0 0 3px rgba(10,10,10,.08); }

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

  .bz-grid-kpi { grid-template-columns: repeat(4, 1fr); }
  .bz-grid-2 { grid-template-columns: 1.15fr 1fr; }
  .bz-grid-3 { grid-template-columns: 1fr 1fr 1fr; }
  .bz-grid-filter { grid-template-columns: 1fr 1fr 1fr auto; }
  @media (max-width:1200px){
    .bz-grid-kpi{grid-template-columns:repeat(2,1fr)!important}
    .bz-grid-3{grid-template-columns:1fr 1fr!important}
    .bz-grid-filter{grid-template-columns:1fr 1fr!important}
  }
  @media (max-width:1100px){ .bz-grid-2{grid-template-columns:1fr!important} }
  @media (max-width:640px){ .bz-grid-kpi,.bz-grid-3,.bz-grid-filter{grid-template-columns:1fr!important} }
  @media (prefers-reduced-motion: reduce){
    .bz-spark-line,.bz-spark-area,.bz-spark-dot,.bz-hbar,.bz-donut-seg,.bz-fade-up,.bz-number,.bz-toast-in,.bz-modal-in{
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
function WizardStepper({ current, onJump, disabled }: { current: WizardStep; onJump: (s: WizardStep) => void; disabled: boolean }) {
  const steps: { id: WizardStep; label: string; hint: string }[] = [
    { id: 1, label: "Template", hint: "Pick a saved design" },
    { id: 2, label: "Audience", hint: "Select recipients" },
    { id: 3, label: "Review", hint: "Confirm & send" },
  ];
  return (
    <div className="bz-fade-up" style={{
      display: "flex", gap: 0, alignItems: "stretch", flexWrap: "wrap",
      background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16,
      overflow: "hidden", marginBottom: 20, animationDelay: ".1s",
    }}>
      {steps.map((s, i) => {
        const on = s.id === current;
        const done = s.id < current;
        return (
          <button
            key={s.id}
            type="button"
            disabled={disabled}
            onClick={() => onJump(s.id)}
            className="bz-seg"
            style={{
              flex: "1 1 200px", textAlign: "left",
              padding: "14px 18px", background: on ? T.black : "#fff",
              color: on ? "#fff" : T.black,
              border: "none", borderRight: i < steps.length - 1 ? `1px solid ${T.line}` : "none",
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
      display: "flex", flexDirection: "column", gap: 10, pointerEvents: "none",
      maxWidth: 380,
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
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: T.muted, fontSize: 14, lineHeight: 1, padding: 0, marginTop: 2,
              }} aria-label="Dismiss">×</button>
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
        {[{ label: "Sent", value: info.sent }, { label: "Failed", value: info.failed }, { label: "Skipped", value: info.skipped }].map((r) => (
          <div key={r.label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: T.muted, fontWeight: 600 }}>{r.label}</span>
            <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: T.black, fontVariantNumeric: "tabular-nums" }}>{r.value.toLocaleString("en-US")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= UI: Template Preview (inline) ================= */
function TemplateInline({ template, onOpen }: { template: Template | null; onOpen: () => void }) {
  if (!template) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 6, padding: "20px 14px", border: `1px dashed ${T.line}`, borderRadius: 12,
        background: T.canvas, minHeight: 108,
      }}>
        <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: T.faint, fontWeight: 600 }}>No template selected</span>
        <span style={{ fontSize: 11.5, color: T.muted }}>Choose a saved template to see its details here.</span>
      </div>
    );
  }

  return (
    <div className="bz-fade-up" style={{
      display: "flex", gap: 14, alignItems: "flex-start", padding: "16px 18px",
      border: `1px solid ${T.black}`, borderRadius: 12, background: T.canvas,
    }}>
      <span style={{
        width: 44, height: 44, borderRadius: 12, background: T.black, color: "#fff",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", flexShrink: 0,
      }}>{template.name.slice(0, 1).toUpperCase()}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, fontFamily: MONO,
            color: "#fff", background: T.black, border: `1px solid ${T.black}`, borderRadius: 999, padding: "3px 10px" }}>
            {template.template_type}
          </span>
          <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, fontFamily: MONO,
            color: T.black, background: "#fff", border: `1px solid ${T.line}`, borderRadius: 999, padding: "3px 10px" }}>
            theme · {template.theme}
          </span>
        </div>
        <h4 style={{ margin: "4px 0 4px", fontSize: 15, fontWeight: 650, letterSpacing: "-0.02em", color: T.black, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {template.name}
        </h4>
        <p style={{ margin: 0, fontFamily: MONO, fontSize: 11, color: T.muted }}>Ready to send · {template.id.slice(0, 8)}…</p>
      </div>
      <button type="button" onClick={onOpen} className="bz-btn-ghost"
        style={{
          padding: "6px 12px", border: `1px solid ${T.line}`, borderRadius: 999,
          background: "#fff", color: T.black, fontFamily: MONO, fontSize: 11, fontWeight: 600,
          letterSpacing: "0.04em", flexShrink: 0,
        }}>
        View
      </button>
    </div>
  );
}

/* ================= UI: Template Modal ================= */
function TemplateModal({ template, onClose }: { template: Template; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(10,10,10,.55)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, zIndex: 900,
    }}>
      <div onClick={(e) => e.stopPropagation()} className="bz-modal-in" style={{
        background: T.surface, border: `1px solid ${T.line}`, borderRadius: 20,
        maxWidth: 560, width: "100%", maxHeight: "90vh", overflow: "auto",
        padding: 28, display: "flex", flexDirection: "column", gap: 20,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: MONO }}>
              Template preview
            </p>
            <h3 style={{ margin: "6px 0 0", fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", color: T.black }}>
              {template.name}
            </h3>
          </div>
          <button type="button" onClick={onClose} style={{
            background: "transparent", border: `1px solid ${T.line}`, borderRadius: 999,
            width: 32, height: 32, cursor: "pointer", color: T.black, fontSize: 16, lineHeight: 1,
          }} aria-label="Close">×</button>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, fontFamily: MONO,
            color: "#fff", background: T.black, border: `1px solid ${T.black}`, borderRadius: 999, padding: "4px 12px" }}>
            {template.template_type}
          </span>
          <span style={{ fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, fontFamily: MONO,
            color: T.black, background: "#fff", border: `1px solid ${T.line}`, borderRadius: 999, padding: "4px 12px" }}>
            theme · {template.theme}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { label: "Template ID", value: template.id },
            { label: "Type", value: template.template_type },
            { label: "Theme", value: template.theme },
            { label: "Status", value: "Saved · ready to send" },
          ].map((r) => (
            <div key={r.label} style={{
              display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12,
              padding: "10px 0", borderBottom: `1px solid ${T.line}`,
            }}>
              <span style={{ fontFamily: MONO, fontSize: 10.5, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{r.label}</span>
              <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: T.black, textAlign: "right", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.value}
              </span>
            </div>
          ))}
        </div>

        <div style={{ padding: "12px 14px", border: `1px solid ${T.line}`, borderRadius: 12, background: T.canvas }}>
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: T.muted, fontFamily: MONO }}>
            Design editing lives in{" "}
            <Link href="/dashboard/templates" style={{ color: T.black, fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 3 }}>
              Central Email Templates
            </Link>. This view is read-only.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Link href="/dashboard/templates" className="bz-btn-ghost" style={{
            padding: "9px 16px", border: `1px solid ${T.black}`, borderRadius: 10,
            background: "#fff", color: T.black, fontFamily: MONO, fontSize: 12, fontWeight: 600,
            textDecoration: "none",
          }}>
            ✎ Edit template
          </Link>
          <button type="button" onClick={onClose} className="bz-btn" style={{
            padding: "9px 16px", border: `1px solid ${T.black}`, borderRadius: 10,
            background: T.black, color: "#fff", fontFamily: MONO, fontSize: 12, fontWeight: 700,
            letterSpacing: "0.06em", textTransform: "uppercase",
          }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= PAGE ================= */
export default function MarketingPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [audienceTruncated, setAudienceTruncated] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [status, setStatus] = useState("Loading users and saved templates…");
  const [working, setWorking] = useState(false);
  const [lastResult, setLastResult] = useState<{ sent: number; failed: number; skipped: number } | null>(null);
  const [batchInfo, setBatchInfo] = useState<BatchInfo | null>(null);
  const [cancelling, setCancelling] = useState(false);

  /* wizard + filters + ui */
  const [step, setStep] = useState<WizardStep>(1);
  const [filterCountry, setFilterCountry] = useState("");
  const [filterLanguage, setFilterLanguage] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const toastSeq = useRef(0);

  const abortRef = useRef<AbortController | null>(null);

  /* toasts */
  const pushToast = useCallback((text: string, tone: Toast["tone"] = "info") => {
    const id = ++toastSeq.current;
    setToasts((cur) => [...cur, { id, text, tone }]);
    setTimeout(() => setToasts((cur) => cur.filter((t) => t.id !== id)), 6000);
  }, []);
  const dismissToast = (id: number) => setToasts((cur) => cur.filter((t) => t.id !== id));

  /* load */
  useEffect(() => {
    Promise.all([
      fetch("/api/admin/marketing", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/admin/email-templates", { cache: "no-store" }).then((response) => response.json()),
    ]).then(([marketingJson, templatesJson]) => {
      const marketingData = marketingJson.data ?? marketingJson;
      const templateData = templatesJson.data ?? templatesJson;
      if (marketingJson.error || templatesJson.error) throw new Error(marketingJson.error?.message ?? templatesJson.error?.message ?? "Could not load audience.");
      const existingMarketingAndBirthday = (templateData.templates ?? []).filter((template: Template) => template.template_type !== "occasion");
      setUsers(marketingData.users ?? []);
      setAudienceTruncated(Boolean(marketingData.audience_truncated));
      setTeams(marketingData.teams ?? []);
      setTemplates(existingMarketingAndBirthday);
      setTemplateId(existingMarketingAndBirthday[0]?.id ?? "");
      setStatus("");
    }).catch((error) => setStatus(error instanceof Error ? error.message : "Could not load users and saved templates."));
  }, []);

  /* Escape cancels send if working */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && working && !cancelling && abortRef.current) {
        setCancelling(true);
        abortRef.current.abort();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [working, cancelling]);

  async function sendBatch(recipientIds: string[], selectedTemplate: Template, signal?: AbortSignal) {
    const response = await fetch("/api/admin/marketing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send", template_id: selectedTemplate.id, template: selectedTemplate.template_type, selected_user_ids: recipientIds, team_ids: [] }),
      signal,
    });
    const json = await response.json();
    const data = json.data ?? json;
    if (!response.ok) throw new Error(json.error?.message ?? "Send failed.");
    return { sent: Number(data.sent ?? 0), failed: Number(data.failed ?? 0), skipped: Number(data.skipped ?? 0) };
  }

  function cancelSend() {
    if (abortRef.current) {
      setCancelling(true);
      abortRef.current.abort();
    }
  }

  async function send() {
    if (!templateId) { setStatus("Select a saved template first."); return; }
    if (!selectedUsers.length && !teamIds.length) { setStatus("Select at least one user, filtered audience, or team."); return; }
    const template = templates.find((item) => item.id === templateId);
    if (!template) { setStatus("The selected template is unavailable. Reload the page and choose it again."); return; }
    const audience = selectedUsers.length ? `${selectedUsers.length} selected user(s)` : `${teamIds.length} selected team(s)`;
    if (!window.confirm(`Send "${template.name}" to ${audience}? Only active users with marketing email consent will receive it.`)) return;

    setWorking(true);
    setLastResult(null);
    setBatchInfo(null);
    setCancelling(false);
    pushToast(`Started sending "${template.name}" to ${audience}.`, "info");

    const controller = new AbortController();
    abortRef.current = controller;

    let sent = 0, failed = 0, skipped = 0, completedBatches = 0, aborted = false;

    try {
      if (selectedUsers.length) {
        const batches = Array.from({ length: Math.ceil(selectedUsers.length / BATCH_SIZE) }, (_, index) => selectedUsers.slice(index * BATCH_SIZE, (index + 1) * BATCH_SIZE));
        setBatchInfo({ current: 0, total: batches.length, sent: 0, failed: 0, skipped: 0, startedAt: Date.now() });

        for (let index = 0; index < batches.length; index += 1) {
          if (controller.signal.aborted) { aborted = true; break; }
          const batch = batches[index];
          setBatchInfo({ current: index + 1, total: batches.length, sent, failed, skipped, startedAt: Date.now() - (index * 2000) });
          setStatus(`Sending batch ${index + 1} of ${batches.length} (${sent} sent so far)…`);

          const result = await sendBatch(batch, template, controller.signal);
          sent += result.sent; failed += result.failed; skipped += result.skipped; completedBatches += 1;

          setBatchInfo({ current: index + 1, total: batches.length, sent, failed, skipped, startedAt: Date.now() - ((index + 1) * 2000) });
          setSelectedUsers((current) => current.filter((id) => !batch.includes(id)));
        }

        if (aborted) {
          setStatus(`Cancelled after ${sent} sent, ${failed} failed, ${skipped} skipped across ${completedBatches} logged batch(es). The remaining recipients were not contacted.`);
          pushToast(`Cancelled · ${sent} sent, ${failed} failed, ${skipped} skipped.`, "warn");
        } else {
          setStatus(`Email complete: ${sent} sent, ${failed} failed, ${skipped} skipped across ${completedBatches} logged campaign batch(es).`);
          pushToast(`Campaign complete · ${sent} sent, ${failed} failed, ${skipped} skipped.`, failed > 0 ? "warn" : "ok");
        }
        setLastResult({ sent, failed, skipped });
      } else {
        setStatus("Sending to selected teams…");
        const response = await fetch("/api/admin/marketing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "send", template_id: templateId, template: template.template_type, selected_user_ids: [], team_ids: teamIds }),
          signal: controller.signal,
        });
        const json = await response.json();
        const data = json.data ?? json;
        if (!response.ok) { setStatus(json.error?.message ?? "Send failed."); pushToast(json.error?.message ?? "Send failed.", "error"); return; }
        setStatus(`Email complete: ${data.sent ?? 0} sent, ${data.failed ?? 0} failed, ${data.skipped ?? 0} skipped.`);
        pushToast(`Team campaign complete · ${data.sent ?? 0} sent, ${data.failed ?? 0} failed.`, (data.failed ?? 0) > 0 ? "warn" : "ok");
        setLastResult({ sent: Number(data.sent ?? 0), failed: Number(data.failed ?? 0), skipped: Number(data.skipped ?? 0) });
      }
    } catch (error) {
      const isAbort = error instanceof DOMException && error.name === "AbortError";
      if (isAbort) {
        setStatus(`Cancelled after ${sent} sent, ${failed} failed and ${skipped} skipped. Remaining recipients were not contacted.`);
        pushToast(`Cancelled · ${sent} sent, ${failed} failed.`, "warn");
      } else {
        const message = error instanceof Error ? error.message : "The send request did not complete.";
        setStatus(`Stopped after ${sent} sent, ${failed} failed and ${skipped} skipped. ${message} Check the campaign delivery records before retrying.`);
        pushToast(`Send stopped · ${message}`, "error");
      }
      setLastResult({ sent, failed, skipped });
    } finally {
      abortRef.current = null;
      setWorking(false);
      setCancelling(false);
      setBatchInfo(null);
    }
  }

  /* -------- derived (all real) -------- */
  const selectedTemplate = useMemo(() => templates.find((t) => t.id === templateId) ?? null, [templates, templateId]);

  /* filter options */
  const countryOptions = useMemo(() => {
    const map = new Map<string, number>();
    users.forEach((u) => {
      const k = ((u as unknown as { country_code?: string | null }).country_code ?? "").trim().toUpperCase() || "UNKNOWN";
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [users]);

  const languageOptions = useMemo(() => {
    const map = new Map<string, number>();
    users.forEach((u) => {
      const k = ((u as unknown as { preferred_language?: string | null }).preferred_language ?? "").trim().toLowerCase() || "unknown";
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [users]);

  /* filtered pool for the recipient selector */
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const anyU = u as unknown as { country_code?: string | null; preferred_language?: string | null };
      if (filterCountry && ((anyU.country_code ?? "").trim().toUpperCase() || "UNKNOWN") !== filterCountry) return false;
      if (filterLanguage && ((anyU.preferred_language ?? "").trim().toLowerCase() || "unknown") !== filterLanguage) return false;
      return true;
    });
  }, [users, filterCountry, filterLanguage]);

  /* selected-user details */
  const selectedUserObjects = useMemo(
    () => users.filter((u) => selectedUsers.includes(u.id)),
    [users, selectedUsers]
  );

  /* audience insight pools (all vs selected) */
  const audienceForInsights = selectedUsers.length > 0 ? selectedUserObjects : users;

  const insightLangMap = new Map<string, number>();
  audienceForInsights.forEach((u) => {
    const k = ((u as unknown as { preferred_language?: string | null }).preferred_language ?? "").trim().toLowerCase() || "unknown";
    insightLangMap.set(k, (insightLangMap.get(k) ?? 0) + 1);
  });
  const langSegments = Array.from(insightLangMap.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  const otherLangs = langSegments.slice(3).reduce((s, c) => s + c.value, 0);
  const donutSegments = otherLangs > 0 ? [...langSegments.slice(0, 3), { label: "Other", value: otherLangs }] : langSegments.slice(0, 4);

  const insightCountryMap = new Map<string, number>();
  audienceForInsights.forEach((u) => {
    const k = ((u as unknown as { country_code?: string | null }).country_code ?? "").trim().toUpperCase() || "UNKNOWN";
    insightCountryMap.set(k, (insightCountryMap.get(k) ?? 0) + 1);
  });
  const topCountries = Array.from(insightCountryMap.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 5);

  /* audience size + estimated */
  const audienceSize = selectedUsers.length > 0
    ? selectedUsers.length
    : teamIds.length > 0
      ? users.filter((u) => {
          const anyTeam = u as unknown as { sector_ids?: string[] };
          return Array.isArray(anyTeam.sector_ids) && anyTeam.sector_ids.some((s) => teamIds.includes(s));
        }).length
      : 0;

  const estimatedBatches = selectedUsers.length > 0 ? Math.ceil(selectedUsers.length / BATCH_SIZE) : 0;
  const estimatedSeconds = estimatedBatches * 2;

  const kpis = [
    { label: "Eligible users", value: users.length, detail: audienceTruncated ? "Capped at 1,000" : "All opted-in active users", spark: undefined as number[] | undefined },
    { label: "Teams / sectors", value: teams.length, detail: teams.length > 0 ? "Ready for team send" : "No teams loaded" },
    { label: "Templates", value: templates.length, detail: `${templates.filter((t) => t.template_type === "marketing").length} marketing · ${templates.filter((t) => t.template_type === "birthday").length} birthday` },
    { label: "Selected", value: audienceSize, detail: selectedUsers.length > 0 ? `${selectedUsers.length} individual` : teamIds.length > 0 ? `${teamIds.length} team(s)` : "Nothing selected" },
  ];

  const loading = status.startsWith("Loading");

  const canContinueFromStep1 = Boolean(templateId);
  const canContinueFromStep2 = selectedUsers.length > 0 || teamIds.length > 0;
  const canSend = Boolean(templateId) && (selectedUsers.length > 0 || teamIds.length > 0) && !working;

  /* quick segments */
  const segments = [
    { key: "all", label: `All filtered · ${filteredUsers.length}`, apply: () => setSelectedUsers(filteredUsers.map((u) => u.id)), disabled: working || filteredUsers.length === 0 },
    { key: "first50", label: "First 50", apply: () => setSelectedUsers(filteredUsers.slice(0, 50).map((u) => u.id)), disabled: working || filteredUsers.length === 0 },
    { key: "clear", label: "Clear", apply: () => setSelectedUsers([]), disabled: working || selectedUsers.length === 0 },
  ];

  return (
    <div style={{ background: T.canvas, minHeight: "100%", padding: "32px clamp(20px, 4vw, 48px) 160px", color: T.ink, fontFamily: SANS }}>
      <style>{ANIM_CSS}</style>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      {previewOpen && selectedTemplate && <TemplateModal template={selectedTemplate} onClose={() => setPreviewOpen(false)} />}

      {/* ============ BREADCRUMB ============ */}
      <nav style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontFamily: MONO, fontSize: 11.5, color: T.muted }}>
        <Link href="/dashboard" style={{ color: T.muted, textDecoration: "none" }}>Control room</Link>
        <span style={{ color: T.faint }}>/</span>
        <span style={{ color: T.black, fontWeight: 600 }}>Marketing emails</span>
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
              Communications · Send only
            </span>
          </div>
          <h1 style={{ margin: "0 0 10px", fontSize: "clamp(26px, 3.2vw, 38px)", lineHeight: 1.05, fontWeight: 700, letterSpacing: "-0.035em", color: T.black }}>
            Marketing emails
          </h1>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: T.muted, maxWidth: 660 }}>
            Guided 3-step sending — pick a template, filter your audience, then review and dispatch.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" }}>
          <Link href="/dashboard/templates" className="bz-btn-ghost" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            fontSize: 12, fontWeight: 600, fontFamily: MONO, letterSpacing: "0.04em",
            color: T.black, background: "#fff", border: `1px solid ${T.black}`,
            borderRadius: 999, padding: "8px 16px",
          }}>
            ✎ Edit / save templates
          </Link>
          <span style={{ fontFamily: MONO, fontSize: 11.5, color: T.faint }}>
            {users.length.toLocaleString("en-US")} eligible {users.length === 1 ? "recipient" : "recipients"}
          </span>
        </div>
      </header>

      {/* ============ WIZARD STEPPER ============ */}
      <WizardStepper current={step} onJump={setStep} disabled={working} />

      {/* ============ KPI STRIP ============ */}
      <section style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 600, color: T.muted, fontFamily: MONO }}>
            Campaign overview
          </h2>
          <span style={{ fontFamily: MONO, fontSize: 11.5, color: T.faint }}>live · opted-in audience only</span>
        </div>
        <div className="bz-grid-kpi" style={{ display: "grid", gap: 12 }}>
          {kpis.map((k, i) => (
            <KPICard key={k.label} index={i + 1} label={k.label} value={k.value} detail={k.detail} spark={k.spark} delay={0.05 * i} />
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
          {working || loading ? (
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
      {lastResult && !working && (
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
                batch result
              </span>
            </div>
          ))}
        </section>
      )}

      {/* ============ STEP 1: TEMPLATE ============ */}
      {step === 1 && (
        <section className="bz-grid-2" style={{ display: "grid", gap: 16, marginBottom: 16 }}>
          <Panel eyebrow="Step 1 · Template" title="Choose the saved design" delay={0.3}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", color: T.muted, fontWeight: 600 }}>
                Saved template
              </label>
              <select className="bz-select" value={templateId}
                onChange={(event) => setTemplateId(event.target.value)}
                disabled={working || loading}
                style={{
                  width: "100%", padding: "12px 14px", fontSize: 13.5,
                  border: `1px solid ${T.line}`, borderRadius: 10,
                  background: "#fff", color: T.black, fontFamily: SANS,
                }}>
                <option value="">Select a saved template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} · {template.template_type} · {template.theme}
                  </option>
                ))}
              </select>
              <TemplateInline template={selectedTemplate} onOpen={() => selectedTemplate && setPreviewOpen(true)} />
            </div>

            <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: T.muted }}>
              To create or edit designs, use{" "}
              <Link href="/dashboard/templates" style={{ color: T.black, textDecoration: "underline", textUnderlineOffset: 3 }}>
                Central Email Templates
              </Link>.
            </p>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 12, borderTop: `1px solid ${T.line}` }}>
              <button type="button" className="bz-btn" disabled={!canContinueFromStep1}
                onClick={() => setStep(2)}
                style={{
                  padding: "11px 20px", background: T.black, color: "#fff",
                  border: `1px solid ${T.black}`, borderRadius: 10,
                  fontFamily: MONO, fontSize: 12, fontWeight: 700,
                  letterSpacing: "0.06em", textTransform: "uppercase",
                }}>
                Continue → Audience
              </button>
            </div>
          </Panel>

          <Panel eyebrow="Teams" title="Team / sector targeting (optional)" delay={0.35}>
            <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: T.muted }}>
              Send to whole teams by sector, or skip and pick individuals in the next step. Teams are disabled if individual users are already selected.
            </p>

            {teams.length === 0 ? (
              <div style={{
                padding: "18px 14px", textAlign: "center",
                border: `1px dashed ${T.line}`, borderRadius: 10,
                fontFamily: MONO, fontSize: 12, color: T.muted,
              }}>
                No teams available.
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {teams.map((team, i) => {
                  const on = teamIds.includes(team.id);
                  const disabled = working || selectedUsers.length > 0;
                  return (
                    <button key={team.id} type="button" disabled={disabled}
                      onClick={() => setTeamIds((current) => current.includes(team.id)
                        ? current.filter((value) => value !== team.id)
                        : [...current, team.id])}
                      className={`bz-team bz-fade-up ${on ? "on" : ""}`}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 8,
                        padding: "8px 12px", border: `1px solid ${T.line}`, borderRadius: 999,
                        background: on ? T.black : "#fff", color: on ? "#fff" : T.black,
                        fontFamily: MONO, fontSize: 11.5, fontWeight: 600,
                        animationDelay: `${0.35 + i * 0.03}s`,
                      }}>
                      <span className="bz-team-dot" style={{ width: 6, height: 6, borderRadius: 999, background: on ? "#fff" : T.black }} />
                      {team.sector_name}
                    </button>
                  );
                })}
              </div>
            )}

            {teamIds.length > 0 && (
              <div className="bz-fade-up" style={{
                padding: "12px 14px", border: `1px solid ${T.black}`, borderRadius: 12,
                background: T.canvas, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
              }}>
                <span style={{ fontFamily: MONO, fontSize: 11.5, color: T.ink, fontWeight: 600 }}>
                  {teamIds.length} team{teamIds.length > 1 ? "s" : ""} selected
                </span>
                <button type="button" onClick={() => setTeamIds([])} className="bz-btn-ghost"
                  style={{
                    padding: "5px 10px", border: `1px solid ${T.line}`, borderRadius: 999,
                    background: "#fff", color: T.black, fontFamily: MONO, fontSize: 11, fontWeight: 600,
                  }}>
                  Clear
                </button>
              </div>
            )}
          </Panel>
        </section>
      )}

      {/* ============ STEP 2: AUDIENCE ============ */}
      {step === 2 && (
        <section style={{ marginBottom: 16 }}>
          <Panel eyebrow="Step 2 · Audience" title="Filter and select recipients" delay={0.3}
            action={
              <span style={{
                fontFamily: MONO, fontSize: 11, fontWeight: 600, color: T.black,
                background: "#fff", border: `1px solid ${T.line}`, borderRadius: 999, padding: "4px 10px",
              }}>
                {selectedUsers.length > 0 ? `${selectedUsers.length} selected` : `${filteredUsers.length} eligible`}
              </span>
            }>

            {/* filter row */}
            <div className="bz-grid-filter" style={{ display: "grid", gap: 10, marginBottom: 6 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: T.muted, fontWeight: 600 }}>Country</label>
                <select className="bz-select" value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)} disabled={working}
                  style={{
                    padding: "10px 14px", fontSize: 12.5, border: `1px solid ${T.line}`,
                    borderRadius: 10, background: "#fff", color: T.black, fontFamily: SANS,
                  }}>
                  <option value="">All countries</option>
                  {countryOptions.map((c) => (
                    <option key={c.label} value={c.label}>{c.label} · {c.value}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: T.muted, fontWeight: 600 }}>Language</label>
                <select className="bz-select" value={filterLanguage} onChange={(e) => setFilterLanguage(e.target.value)} disabled={working}
                  style={{
                    padding: "10px 14px", fontSize: 12.5, border: `1px solid ${T.line}`,
                    borderRadius: 10, background: "#fff", color: T.black, fontFamily: SANS,
                  }}>
                  <option value="">All languages</option>
                  {languageOptions.map((l) => (
                    <option key={l.label} value={l.label}>{l.label.toUpperCase()} · {l.value}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: T.muted, fontWeight: 600 }}>Quick select</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {segments.map((seg) => (
                    <button key={seg.key} type="button" disabled={seg.disabled} onClick={seg.apply}
                      className="bz-chip"
                      style={{
                        padding: "7px 12px", borderRadius: 999, border: `1px solid ${T.line}`,
                        background: "#fff", color: T.black,
                        fontFamily: MONO, fontSize: 11, fontWeight: 600,
                      }}>
                      {seg.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, justifyContent: "flex-end" }}>
                {(filterCountry || filterLanguage) && (
                  <button type="button" onClick={() => { setFilterCountry(""); setFilterLanguage(""); }}
                    className="bz-btn-ghost"
                    style={{
                      padding: "8px 12px", border: `1px solid ${T.line}`, borderRadius: 10,
                      background: "#fff", color: T.black, fontFamily: MONO, fontSize: 11, fontWeight: 600,
                      alignSelf: "flex-end",
                    }}>
                    ✕ Reset filters
                  </button>
                )}
              </div>
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
                  The eligible audience reached the current 1,000-profile list limit. The selector contains only the first 1,000; narrow or paginate before sending.
                </p>
              </div>
            )}

            <EmailRecipientSelector
              users={filteredUsers}
              selectedIds={selectedUsers}
              onSelectedIdsChange={setSelectedUsers}
              disabled={working}
            />

            <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: `1px solid ${T.line}`, flexWrap: "wrap" }}>
              <button type="button" className="bz-btn-ghost" onClick={() => setStep(1)} disabled={working}
                style={{
                  padding: "11px 18px", border: `1px solid ${T.line}`, borderRadius: 10,
                  background: "#fff", color: T.black, fontFamily: MONO, fontSize: 12, fontWeight: 600,
                }}>
                ← Back to template
              </button>
              <button type="button" className="bz-btn" disabled={!canContinueFromStep2} onClick={() => setStep(3)}
                style={{
                  padding: "11px 20px", background: T.black, color: "#fff",
                  border: `1px solid ${T.black}`, borderRadius: 10,
                  fontFamily: MONO, fontSize: 12, fontWeight: 700,
                  letterSpacing: "0.06em", textTransform: "uppercase",
                }}>
                Review → Send
              </button>
            </div>
          </Panel>
        </section>
      )}

      {/* ============ STEP 3: REVIEW & SEND ============ */}
      {step === 3 && (
        <section className="bz-grid-2" style={{ display: "grid", gap: 16, marginBottom: 16 }}>
          <Panel eyebrow="Step 3 · Review" title="Confirm before dispatch" delay={0.3}>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              <li style={{ padding: "12px 0", borderBottom: `1px solid ${T.line}` }}>
                <span style={{ fontFamily: MONO, fontSize: 10.5, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Template</span>
                <div style={{ marginTop: 6, fontSize: 14, color: T.black, fontWeight: 650 }}>
                  {selectedTemplate?.name ?? "—"}
                  {selectedTemplate && (
                    <span style={{ marginLeft: 8, fontFamily: MONO, fontSize: 11, color: T.muted, fontWeight: 500 }}>
                      ({selectedTemplate.template_type} · {selectedTemplate.theme})
                    </span>
                  )}
                </div>
              </li>
              <li style={{ padding: "12px 0", borderBottom: `1px solid ${T.line}` }}>
                <span style={{ fontFamily: MONO, fontSize: 10.5, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Audience</span>
                <div style={{ marginTop: 6, fontSize: 14, color: T.black, fontWeight: 650 }}>
                  {selectedUsers.length > 0
                    ? `${selectedUsers.length} individual recipient(s)`
                    : teamIds.length > 0
                      ? `${teamIds.length} team(s)`
                      : "—"}
                </div>
              </li>
              <li style={{ padding: "12px 0", borderBottom: `1px solid ${T.line}` }}>
                <span style={{ fontFamily: MONO, fontSize: 10.5, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Delivery plan</span>
                <div style={{ marginTop: 6, fontFamily: MONO, fontSize: 12.5, color: T.ink }}>
                  {estimatedBatches > 0
                    ? `${estimatedBatches} batch${estimatedBatches > 1 ? "es" : ""} of ${BATCH_SIZE} · ~${estimatedSeconds}s`
                    : "Single team dispatch"}
                </div>
              </li>
              <li style={{ padding: "12px 0" }}>
                <span style={{ fontFamily: MONO, fontSize: 10.5, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Eligibility</span>
                <div style={{ marginTop: 6, fontFamily: MONO, fontSize: 12.5, color: T.ink }}>
                  Active users with marketing consent only
                </div>
              </li>
            </ul>

            <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: `1px solid ${T.line}`, flexWrap: "wrap" }}>
              <button type="button" className="bz-btn-ghost" onClick={() => setStep(2)} disabled={working}
                style={{
                  padding: "11px 18px", border: `1px solid ${T.line}`, borderRadius: 10,
                  background: "#fff", color: T.black, fontFamily: MONO, fontSize: 12, fontWeight: 600,
                }}>
                ← Back to audience
              </button>
              <button type="button" className={working ? "bz-btn-danger" : "bz-btn"}
                onClick={working ? cancelSend : () => void send()}
                disabled={!working && !canSend}
                style={{
                  padding: "12px 22px",
                  background: working ? "#fff" : T.black,
                  color: working ? T.black : "#fff",
                  border: `1px solid ${T.black}`, borderRadius: 10,
                  fontFamily: MONO, fontSize: 12.5, fontWeight: 700,
                  letterSpacing: "0.06em", textTransform: "uppercase",
                }}>
                {working ? (cancelling ? "Cancelling…" : "✕ Cancel send (Esc)") : "Send campaign now"}
              </button>
            </div>
          </Panel>

          <Panel eyebrow="Selected audience" title="Insights for this send" delay={0.35}>
            {audienceForInsights.length === 0 ? (
              <div style={{ padding: 26, textAlign: "center", fontSize: 12, color: T.muted, fontFamily: MONO }}>No recipients selected</div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <Donut segments={donutSegments} size={170} centerLabel="RECIPIENTS" centerValue={audienceForInsights.length} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                  {donutSegments.map((s, i) => (
                    <div key={s.label} className="bz-fade-up" style={{ display: "flex", alignItems: "center", gap: 8, animationDelay: `${0.45 + i * 0.05}s` }}>
                      <span style={{ width: 9, height: 9, borderRadius: 3, background: SHADES[i % SHADES.length], flexShrink: 0 }} />
                      <span style={{ fontFamily: MONO, fontSize: 11.5, color: T.ink, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textTransform: "uppercase" }}>{s.label}</span>
                      <span style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 700, color: T.black }}>{s.value}</span>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 8 }}>
                  <p style={{ margin: "0 0 8px", fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", color: T.muted, fontWeight: 600 }}>
                    Top countries
                  </p>
                  {topCountries.length === 0 ? (
                    <p style={{ margin: 0, fontFamily: MONO, fontSize: 12, color: T.muted }}>No country data</p>
                  ) : (
                    <HBars segments={topCountries.map((c) => ({
                      label: c.label,
                      value: c.value,
                      sub: `${Math.round((c.value / Math.max(audienceForInsights.length, 1)) * 100)}%`,
                    }))} />
                  )}
                </div>
              </>
            )}
          </Panel>
        </section>
      )}

      {/* ============ AUDIENCE ANALYTICS (always visible when no selection) ============ */}
      {step !== 3 && (
        <section className="bz-grid-3" style={{ display: "grid", gap: 16, marginBottom: 16 }}>
          <Panel eyebrow="Audience language" title="Language mix" delay={0.4}>
            {donutSegments.length === 0 ? (
              <div style={{ padding: 26, textAlign: "center", fontSize: 12, color: T.muted, fontFamily: MONO }}>No language data</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <Donut segments={donutSegments} size={170} centerLabel="USERS" centerValue={audienceForInsights.length} />
                <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                  {donutSegments.map((s, i) => (
                    <div key={s.label} className="bz-fade-up" style={{ display: "flex", alignItems: "center", gap: 8, animationDelay: `${0.45 + i * 0.05}s` }}>
                      <span style={{ width: 9, height: 9, borderRadius: 3, background: SHADES[i % SHADES.length], flexShrink: 0 }} />
                      <span style={{ fontFamily: MONO, fontSize: 11.5, color: T.ink, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textTransform: "uppercase" }}>{s.label}</span>
                      <span style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 700, color: T.black }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Panel>

          <Panel eyebrow="Audience geography" title="Top countries" delay={0.45}
            action={<span style={{ fontFamily: MONO, fontSize: 11, color: T.muted, border: `1px solid ${T.line}`, borderRadius: 999, padding: "4px 10px" }}>{countryOptions.length} total</span>}>
            {topCountries.length === 0 ? (
              <div style={{ padding: 26, textAlign: "center", fontSize: 12, color: T.muted, fontFamily: MONO }}>No country data</div>
            ) : (
              <HBars segments={topCountries.map((c) => ({
                label: c.label,
                value: c.value,
                sub: `${Math.round((c.value / Math.max(audienceForInsights.length, 1)) * 100)}%`,
              }))} />
            )}
          </Panel>

          <Panel eyebrow="Readiness" title="Pre-send checklist" delay={0.5}>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {[
                { label: "Template", ok: Boolean(templateId), detail: selectedTemplate ? selectedTemplate.name : "not selected" },
                { label: "Audience", ok: audienceSize > 0, detail: audienceSize > 0 ? `${audienceSize} recipient(s)` : "not selected" },
                { label: "Teams loaded", ok: teams.length > 0, detail: teams.length > 0 ? `${teams.length} available` : "none" },
                { label: "Templates loaded", ok: templates.length > 0, detail: templates.length > 0 ? `${templates.length} available` : "none" },
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

      {/* ============ STICKY ACTION BAR ============ */}
      {canSend && !working && (
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
              {selectedTemplate?.name ?? "—"} · {audienceSize} recipient{audienceSize === 1 ? "" : "s"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="bz-btn-ghost" onClick={() => setStep(1)} disabled={working}
              style={{
                padding: "10px 16px", border: `1px solid ${T.line}`, borderRadius: 10,
                background: "#fff", color: T.black, fontFamily: MONO, fontSize: 12, fontWeight: 600,
              }}>
              Edit
            </button>
            <button type="button" className="bz-btn" onClick={() => void send()}
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
        <span>BINZEO ADMIN CONSOLE — MARKETING v4.0 · WIZARD</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span className="bz-pulse" style={{ width: 6, height: 6, borderRadius: 999, background: T.black }} />
          SEND-ONLY MODE · {users.length.toLocaleString("en-US")} ELIGIBLE · ESC TO CANCEL
        </span>
      </footer>
    </div>
  );
}
