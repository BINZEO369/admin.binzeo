"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EmailRecipientSelector, { type EmailRecipient } from "@/components/EmailRecipientSelector";

/* ================= TYPES ================= */
type OccasionTemplate = { id: string; name: string; subject: string; headline: string; message: string; theme: string };
type Recipient = EmailRecipient & { email: string };
type Delivery = {
  id: string;
  user_id: string | null;
  template_id: string | null;
  template_name: string;
  template_type: string;
  subject: string;
  recipient_email: string;
  recipient_name: string | null;
  status: "sending" | "sent" | "failed";
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
};
type Toast = { id: number; text: string; tone: "info" | "ok" | "warn" | "error" };
type BatchInfo = { current: number; total: number; sent: number; failed: number; startedAt: number };
type WizardStep = 1 | 2 | 3;

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
function statusTone(status: string): "ok" | "warn" | "bad" {
  if (status === "sent") return "ok";
  if (status === "failed") return "warn";
  return "bad";
}
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
  @keyframes bzModalIn { from { opacity: 0; transform: scale(.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
  @keyframes bzMenuIn { from { opacity: 0; transform: translateY(-6px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }

  .bz-spark-line { stroke-dasharray: 500; stroke-dashoffset: 500; animation: bzDraw 1s cubic-bezier(.4,0,.2,1) forwards; }
  .bz-spark-area { opacity: 0; animation: bzFadeIn .7s ease-out .3s forwards; }
  .bz-spark-dot { transform-box: fill-box; transform-origin: center; opacity: 0; animation: bzPop .35s ease-out 1s forwards; }
  .bz-hbar { transform-box: fill-box; transform-origin: left; transform: scaleX(0); animation: bzGrowX .9s cubic-bezier(.2,.7,.2,1) forwards; }
  .bz-donut-seg { opacity: 0; animation: bzFadeIn .8s ease-out forwards; }
  .bz-fade-up { opacity: 0; animation: bzRiseUp .55s cubic-bezier(.2,.7,.2,1) forwards; }
  .bz-number { display: inline-block; opacity: 0; animation: bzRiseUp .5s ease-out forwards; }
  .bz-toast-in { animation: bzSlideInRight .35s cubic-bezier(.2,.7,.2,1) forwards; }
  .bz-modal-in { animation: bzModalIn .3s cubic-bezier(.2,.7,.2,1) forwards; }
  .bz-menu-in { animation: bzMenuIn .18s cubic-bezier(.2,.7,.2,1) forwards; }
  .bz-pulse { animation: bzPulse 2.2s ease-in-out infinite; }
  .bz-spin { animation: bzSpin .9s linear infinite; }

  .bz-card { transition: transform .22s cubic-bezier(.2,.7,.2,1), border-color .22s ease, box-shadow .22s ease; }
  .bz-card:hover { transform: translateY(-2px); border-color: ${T.black}; box-shadow: 0 14px 32px -22px rgba(0,0,0,.24); }

  .bz-team, .bz-seg, .bz-chip { transition: background .18s ease, color .18s ease, border-color .18s ease; cursor: pointer; user-select: none; }
  .bz-team:hover:not(:disabled), .bz-seg:hover:not(:disabled), .bz-chip:hover:not(:disabled) { border-color: ${T.black} !important; }
  .bz-team.on, .bz-seg.on, .bz-chip.on { background: ${T.black} !important; color: #fff !important; border-color: ${T.black} !important; }
  .bz-team.on .bz-team-dot { background: #fff !important; }
  .bz-team:disabled, .bz-seg:disabled, .bz-chip:disabled { opacity: .42; cursor: not-allowed; }

  .bz-opt { background: transparent; color: ${T.ink}; transition: background .15s ease, color .15s ease; }
  .bz-opt:hover { background: ${T.soft}; }
  .bz-opt.on { background: ${T.black}; color: #fff; }
  .bz-opt.on:hover { background: ${T.black}; }

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

  .bz-table { width: 100%; border-collapse: collapse; }
  .bz-table th { text-align: left; font-family: ${MONO}; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: ${T.muted}; font-weight: 600; padding: 10px 12px; border-bottom: 1px solid ${T.line}; }
  .bz-table td { padding: 12px; font-size: 12.5px; color: ${T.ink}; border-bottom: 1px solid ${T.line}; }
  .bz-table tr:hover td { background: ${T.canvas}; }
  .bz-table .bz-cell-muted { color: ${T.muted}; font-family: ${MONO}; font-size: 11.5px; }

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
    .bz-spark-line,.bz-spark-area,.bz-spark-dot,.bz-hbar,.bz-donut-seg,.bz-fade-up,.bz-number,.bz-toast-in,.bz-modal-in,.bz-menu-in{
      animation: none !important; opacity: 1 !important; transform: none !important; stroke-dashoffset: 0 !important;
    }
    .bz-progress-fill { animation: none !important; }
  }
`;

/* ================= UI: Custom Select ================= */
function CustomSelect({
  value, onChange, options, placeholder, disabled = false, compact = false, ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  compact?: boolean;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);
  const displayLabel = current ? current.label : (placeholder ?? "—");
  const hasValue = Boolean(current && current.value !== "");
  const pad = compact ? "10px 14px" : "12px 14px";
  const fs = compact ? 12.5 : 13.5;

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
          padding: pad,
          border: `1px solid ${open ? T.black : T.line}`,
          borderRadius: 10,
          background: "#fff",
          color: hasValue ? T.black : T.muted,
          fontFamily: SANS,
          fontSize: fs,
          textAlign: "left",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.45 : 1,
          transition: "border-color .18s ease, box-shadow .18s ease",
          boxShadow: open ? "0 0 0 3px rgba(10,10,10,.08)" : "none",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
          {displayLabel}
        </span>
        <svg width="12" height="8" viewBox="0 0 12 8"
          style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s ease" }}>
          <path fill="none" stroke={T.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M1 1.5l5 5 5-5" />
        </svg>
      </button>

      {open && (
        <div role="listbox" className="bz-menu-in" style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 50,
          background: "#fff", border: `1px solid ${T.black}`, borderRadius: 12,
          boxShadow: "0 18px 40px -22px rgba(0,0,0,.28)",
          maxHeight: 300, overflowY: "auto", padding: 6,
        }}>
          {options.length === 0 ? (
            <div style={{ padding: "10px 12px", fontFamily: MONO, fontSize: 12, color: T.muted }}>No options</div>
          ) : (
            options.map((opt) => {
              const selected = opt.value === value;
              return (
                <button
                  key={opt.value || "__empty__"}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`bz-opt ${selected ? "on" : ""}`}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                    width: "100%", padding: "10px 12px", border: "none", borderRadius: 8,
                    fontFamily: SANS, fontSize: 13, textAlign: "left", cursor: "pointer",
                    fontWeight: selected ? 600 : 500,
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                    {opt.label}
                  </span>
                  {selected && <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700 }}>✓</span>}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

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
    { id: 1, label: "Template", hint: "Pick an occasion design" },
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
          <button key={s.id} type="button" disabled={disabled} onClick={() => onJump(s.id)}
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
            Sending {info.current} / {info.total}
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
        {[{ label: "Sent", value: info.sent }, { label: "Failed", value: info.failed }].map((r) => (
          <div key={r.label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: T.muted, fontWeight: 600 }}>{r.label}</span>
            <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: T.black, fontVariantNumeric: "tabular-nums" }}>{r.value.toLocaleString("en-US")}</span>
          </div>
        ))}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: T.muted, fontWeight: 600 }}>Remaining</span>
          <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: T.black, fontVariantNumeric: "tabular-nums" }}>{remaining.toLocaleString("en-US")}</span>
        </div>
      </div>
    </div>
  );
}

/* ================= UI: Template Preview Inline ================= */
function TemplateInline({ template, onOpen }: { template: OccasionTemplate | null; onOpen: () => void }) {
  if (!template) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 6, padding: "20px 14px", border: `1px dashed ${T.line}`, borderRadius: 12,
        background: T.canvas, minHeight: 108,
      }}>
        <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: T.faint, fontWeight: 600 }}>No template selected</span>
        <span style={{ fontSize: 11.5, color: T.muted }}>Choose a saved occasion template to see its details here.</span>
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
            occasion
          </span>
          <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, fontFamily: MONO,
            color: T.black, background: "#fff", border: `1px solid ${T.line}`, borderRadius: 999, padding: "3px 10px" }}>
            theme · {template.theme}
          </span>
        </div>
        <h4 style={{ margin: "4px 0 4px", fontSize: 15, fontWeight: 650, letterSpacing: "-0.02em", color: T.black, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {template.name}
        </h4>
        <p style={{ margin: 0, fontFamily: MONO, fontSize: 11, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          Subject · {template.subject}
        </p>
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
function TemplateModal({ template, onClose }: { template: OccasionTemplate; onClose: () => void }) {
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
        maxWidth: 620, width: "100%", maxHeight: "90vh", overflow: "auto",
        padding: 28, display: "flex", flexDirection: "column", gap: 20,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: MONO }}>
              Occasion template preview
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
            occasion
          </span>
          <span style={{ fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, fontFamily: MONO,
            color: T.black, background: "#fff", border: `1px solid ${T.line}`, borderRadius: 999, padding: "4px 12px" }}>
            theme · {template.theme}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <div style={{ padding: "12px 0", borderBottom: `1px solid ${T.line}` }}>
            <span style={{ fontFamily: MONO, fontSize: 10.5, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Subject</span>
            <div style={{ marginTop: 6, fontFamily: SANS, fontSize: 14, color: T.black, fontWeight: 600 }}>{template.subject}</div>
          </div>
          <div style={{ padding: "12px 0", borderBottom: `1px solid ${T.line}` }}>
            <span style={{ fontFamily: MONO, fontSize: 10.5, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Headline</span>
            <div style={{ marginTop: 6, fontFamily: SANS, fontSize: 16, color: T.black, fontWeight: 650 }}>{template.headline}</div>
          </div>
          <div style={{ padding: "12px 0" }}>
            <span style={{ fontFamily: MONO, fontSize: 10.5, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Message</span>
            <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.65, color: T.ink, whiteSpace: "pre-wrap" }}>
              {template.message}
            </p>
          </div>
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
            background: "#fff", color: T.black, fontFamily: MONO, fontSize: 12, fontWeight: 600, textDecoration: "none",
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
export default function OccasionEmailsPage() {
  const [templates, setTemplates] = useState<OccasionTemplate[]>([]);
  const [users, setUsers] = useState<Recipient[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [audienceTruncated, setAudienceTruncated] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Loading occasion templates, eligible users and send history…");
  const [loading, setLoading] = useState(true);
  const [sendingUserId, setSendingUserId] = useState<string | null>(null);
  const [bulkSending, setBulkSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ sent: number; failed: number } | null>(null);
  const [batchInfo, setBatchInfo] = useState<BatchInfo | null>(null);
  const [cancelling, setCancelling] = useState(false);

  /* wizard + ui */
  const [step, setStep] = useState<WizardStep>(1);
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

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/occasion-emails", { cache: "no-store" });
      const json = await response.json();
      const data = json.data ?? json;
      if (!response.ok) {
        setStatus(json.error?.message ?? "Occasion email data could not be loaded.");
        return;
      }
      const nextTemplates = data.templates ?? [];
      setTemplates(nextTemplates);
      setUsers(data.users ?? []);
      setAudienceTruncated(Boolean(data.audience_truncated));
      setDeliveries(data.deliveries ?? []);
      setTemplateId((current: string) => current && nextTemplates.some((template: OccasionTemplate) => template.id === current) ? current : nextTemplates[0]?.id ?? "");
      setStatus("");
    } catch {
      setStatus("Could not reach the occasion email service.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  /* Escape cancels bulk send */
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

  /* ============ derived (all real) ============ */
  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId) ?? null,
    [templates, templateId]
  );

  const visibleUsers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return users.filter((user) => !needle || `${user.display_name ?? ""} ${user.email}`.toLowerCase().includes(needle));
  }, [users, search]);

  const visibleDeliveries = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return deliveries.filter((d) => !needle || `${d.recipient_name ?? ""} ${d.recipient_email} ${d.template_name} ${d.subject}`.toLowerCase().includes(needle));
  }, [deliveries, search]);

  const lastDeliveryByPair = useMemo(() => {
    const byPair = new Map<string, Delivery>();
    for (const delivery of deliveries) {
      if (!delivery.user_id || !delivery.template_id) continue;
      const key = `${delivery.user_id}:${delivery.template_id}`;
      if (!byPair.has(key)) byPair.set(key, delivery);
    }
    return byPair;
  }, [deliveries]);

  /* delivery stats */
  const sentCount = deliveries.filter((d) => d.status === "sent").length;
  const failedCount = deliveries.filter((d) => d.status === "failed").length;
  const sendingCount = deliveries.filter((d) => d.status === "sending").length;
  const lastSendAt = deliveries.reduce<string | null>((acc, d) => {
    const t = d.sent_at ?? d.created_at;
    if (!t) return acc;
    return !acc || t > acc ? t : acc;
  }, null);

  /* per-template delivery distribution (top templates) */
  const templateDeliveries = useMemo(() => {
    const map = new Map<string, number>();
    deliveries.forEach((d) => {
      const k = d.template_name || "Unknown";
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [deliveries]);

  /* status distribution (donut) */
  const statusSegments = useMemo(() => {
    const segs = [
      { label: "sent", value: sentCount },
      { label: "failed", value: failedCount },
      { label: "sending", value: sendingCount },
    ].filter((s) => s.value > 0);
    return segs;
  }, [sentCount, failedCount, sendingCount]);

  /* KPI values */
  const kpis = [
    { label: "Eligible users", value: users.length, detail: audienceTruncated ? "Capped at 1,000" : "All opted-in active users" },
    { label: "Occasion templates", value: templates.length, detail: templates.length > 0 ? "Ready to send" : "None saved yet" },
    { label: "Selected", value: selectedUserIds.length, detail: selectedUserIds.length > 0 ? `${selectedUserIds.length} individual(s)` : "Nothing selected" },
    { label: "Delivered", value: sentCount, detail: failedCount > 0 ? `${failedCount} failed · ${fmt(deliveries.length)} total` : `${fmt(deliveries.length)} total attempts` },
  ];

  /* readiness */
  const canContinueFromStep1 = Boolean(templateId);
  const canContinueFromStep2 = selectedUserIds.length > 0;
  const canSend = Boolean(templateId) && selectedUserIds.length > 0 && !bulkSending && sendingUserId === null;

  /* custom select options */
  const templateSelectOptions = [
    { value: "", label: "Select an Occasion template" },
    ...templates.map((t) => ({ value: t.id, label: `${t.name} · ${t.theme}` })),
  ];

  /* ============ send one user ============ */
  async function sendToUser(user: Recipient) {
    const template = templates.find((item) => item.id === templateId);
    if (!template) { setStatus("Save an Occasion-type template first."); pushToast("Select an Occasion template first.", "warn"); return; }
    const prior = lastDeliveryByPair.get(`${user.id}:${template.id}`);
    const action = prior?.status === "sent" ? "Resend" : "Send";
    const confirmed = window.confirm(`${action} "${template.name}" to ${user.display_name || user.email} (${user.email})? This sends one email to this user only.`);
    if (!confirmed) return;

    setSendingUserId(user.id);
    setStatus("");
    try {
      const response = await fetch("/api/admin/occasion-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, template_id: template.id }),
      });
      const json = await response.json();
      const data = json.data ?? json;
      if (!response.ok) {
        const errorMessage = json.error?.message ?? "Email could not be sent.";
        await load();
        setStatus(errorMessage);
        pushToast(errorMessage, "error");
        return;
      }
      await load();
      setStatus(`"${template.name}" sent to ${user.display_name || user.email}; the delivery is recorded below.`);
      pushToast(`Sent "${template.name}" to ${user.display_name || user.email}.`, "ok");
    } catch {
      await load();
      setStatus("The send request did not complete. Check the delivery history before retrying.");
      pushToast("Send request did not complete.", "error");
    } finally {
      setSendingUserId(null);
    }
  }

  /* ============ bulk send ============ */
  function cancelBulk() {
    if (abortRef.current) {
      setCancelling(true);
      abortRef.current.abort();
    }
  }

  async function sendBulk() {
    const template = templates.find((item) => item.id === templateId);
    const selected = users.filter((user) => selectedUserIds.includes(user.id));
    if (!template) { setStatus("Save an Occasion-type template first."); pushToast("Select an Occasion template first.", "warn"); return; }
    if (!selected.length) { setStatus("Select at least one eligible user."); pushToast("Select at least one recipient.", "warn"); return; }
    if (!window.confirm(`Send "${template.name}" to ${selected.length} selected user(s), one email per person? Each delivery will be individually logged.`)) return;

    setBulkSending(true);
    setLastResult(null);
    setBatchInfo(null);
    setCancelling(false);
    setStatus("");
    pushToast(`Started sending "${template.name}" to ${selected.length} recipient(s).`, "info");

    const controller = new AbortController();
    abortRef.current = controller;

    let sent = 0;
    let failed = 0;
    let stoppedOnUnknownResult = false;
    let completed = 0;
    const startedAt = Date.now();

    setBatchInfo({ current: 0, total: selected.length, sent: 0, failed: 0, startedAt });

    try {
      for (let index = 0; index < selected.length; index += 1) {
        if (controller.signal.aborted) { stoppedOnUnknownResult = true; break; }
        const user = selected[index];
        setBatchInfo({ current: index + 1, total: selected.length, sent, failed, startedAt });
        setStatus(`Sending ${index + 1} of ${selected.length} · ${sent} sent so far…`);
        try {
          const response = await fetch("/api/admin/occasion-emails", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id, template_id: template.id }),
            signal: controller.signal,
          });
          const json = await response.json();
          const data = json.data ?? json;
          if (response.ok && data.sent) sent += 1;
          else failed += 1;
          completed += 1;
          setSelectedUserIds((current) => current.filter((id) => id !== user.id));
          setBatchInfo({ current: index + 1, total: selected.length, sent, failed, startedAt });
        } catch (err) {
          const isAbort = err instanceof DOMException && err.name === "AbortError";
          if (isAbort) { stoppedOnUnknownResult = true; break; }
          stoppedOnUnknownResult = true;
          break;
        }
      }
      await load();

      const wasAborted = controller.signal.aborted;
      if (wasAborted) {
        setStatus(`Cancelled after ${sent} sent, ${failed} failed. Remaining recipients were not contacted.`);
        pushToast(`Cancelled · ${sent} sent, ${failed} failed.`, "warn");
      } else if (stoppedOnUnknownResult) {
        setStatus(`Stopped after ${sent} sent and ${failed} failed; the current result is unknown. Check the delivery history before retrying the remaining selection.`);
        pushToast(`Stopped · ${sent} sent, ${failed} failed.`, "warn");
      } else {
        setStatus(`Occasion emails complete: ${sent} sent, ${failed} failed. Each attempt is recorded in the delivery history.`);
        pushToast(`Campaign complete · ${sent} sent, ${failed} failed.`, failed > 0 ? "warn" : "ok");
      }
      setLastResult({ sent, failed });
    } finally {
      abortRef.current = null;
      setBulkSending(false);
      setCancelling(false);
      setBatchInfo(null);
      void completed;
    }
  }

  return (
    <div style={{ background: T.canvas, minHeight: "100%", padding: "32px clamp(20px, 4vw, 48px) 160px", color: T.ink, fontFamily: SANS }}>
      <style>{ANIM_CSS}</style>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      {previewOpen && selectedTemplate && <TemplateModal template={selectedTemplate} onClose={() => setPreviewOpen(false)} />}

      {/* ============ BREADCRUMB ============ */}
      <nav style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontFamily: MONO, fontSize: 11.5, color: T.muted }}>
        <Link href="/dashboard" style={{ color: T.muted, textDecoration: "none" }}>Control room</Link>
        <span style={{ color: T.faint }}>/</span>
        <Link href="/dashboard/marketing" style={{ color: T.muted, textDecoration: "none" }}>Communications</Link>
        <span style={{ color: T.faint }}>/</span>
        <span style={{ color: T.black, fontWeight: 600 }}>Occasion emails</span>
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
              Communications · Occasion wishes
            </span>
          </div>
          <h1 style={{ margin: "0 0 10px", fontSize: "clamp(26px, 3.2vw, 38px)", lineHeight: 1.05, fontWeight: 700, letterSpacing: "-0.035em", color: T.black }}>
            Occasion email sender
          </h1>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: T.muted, maxWidth: 660 }}>
            Guided 3-step sending — pick a saved occasion template, filter eligible users, then review and dispatch. Each send is individually confirmed and logged.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" }}>
          <Link href="/dashboard/templates" className="bz-btn-ghost" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            fontSize: 12, fontWeight: 600, fontFamily: MONO, letterSpacing: "0.04em",
            color: T.black, background: "#fff", border: `1px solid ${T.black}`,
            borderRadius: 999, padding: "8px 16px",
          }}>
            ✎ Manage email templates
          </Link>
          <span style={{ fontFamily: MONO, fontSize: 11.5, color: T.faint }}>
            {users.length.toLocaleString("en-US")} eligible {users.length === 1 ? "user" : "users"} · {templates.length} template{templates.length === 1 ? "" : "s"}
          </span>
        </div>
      </header>

      {/* ============ WIZARD STEPPER ============ */}
      <WizardStepper current={step} onJump={setStep} disabled={bulkSending || sendingUserId !== null} />

      {/* ============ KPI STRIP ============ */}
      <section style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 600, color: T.muted, fontFamily: MONO }}>
            Campaign overview
          </h2>
          <span style={{ fontFamily: MONO, fontSize: 11.5, color: T.faint }}>
            {lastSendAt ? `last send · ${ago(lastSendAt)}` : "no sends yet"}
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
          {bulkSending || loading || sendingUserId !== null ? (
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

      {/* ============ STEP 1: TEMPLATE ============ */}
      {step === 1 && (
        <section className="bz-grid-2" style={{ display: "grid", gap: 16, marginBottom: 16 }}>
          <Panel eyebrow="Step 1 · Template" title="Choose an occasion design" delay={0.3}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", color: T.muted, fontWeight: 600 }}>
                Saved occasion template
              </label>
              <CustomSelect
                value={templateId}
                onChange={setTemplateId}
                options={templateSelectOptions}
                disabled={loading || !templates.length}
                ariaLabel="Saved occasion template"
              />
              <TemplateInline template={selectedTemplate} onOpen={() => selectedTemplate && setPreviewOpen(true)} />
            </div>

            <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: T.muted }}>
              To create or edit occasion designs, start from a wish preset in{" "}
              <Link href="/dashboard/templates" style={{ color: T.black, textDecoration: "underline", textUnderlineOffset: 3 }}>
                Central Email Templates
              </Link>{" "}
              and save the message.
            </p>

            {!templates.length && !loading && (
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
                  No saved Occasion templates yet.{" "}
                  <Link href="/dashboard/templates" style={{ color: T.black, fontWeight: 700, textDecoration: "underline", textUnderlineOffset: 3 }}>
                    Create one from the wish-title presets
                  </Link>
                  , complete its message, and save it first.
                </p>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 12, borderTop: `1px solid ${T.line}` }}>
              <button type="button" className="bz-btn" disabled={!canContinueFromStep1} onClick={() => setStep(2)}
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

          <Panel eyebrow="Audit" title="Send history snapshot" delay={0.35}>
            {deliveries.length === 0 ? (
              <div style={{ padding: 26, textAlign: "center", fontSize: 12, color: T.muted, fontFamily: MONO }}>
                No occasion emails have been recorded yet.
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <Donut segments={statusSegments} size={170} centerLabel="DELIVERIES" centerValue={deliveries.length} />
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
              </>
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
                {selectedUserIds.length > 0 ? `${selectedUserIds.length} selected` : `${visibleUsers.length} eligible`}
              </span>
            }>

            {/* search row */}
            <div className="bz-grid-filter" style={{ display: "grid", gap: 10, marginBottom: 6 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: "span 2" }}>
                <label style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: T.muted, fontWeight: 600 }}>Search</label>
                <input
                  className="bz-input"
                  placeholder="Name, email, or template"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  disabled={bulkSending || sendingUserId !== null}
                  style={{
                    padding: "11px 14px", fontSize: 13,
                    border: `1px solid ${T.line}`, borderRadius: 10,
                    background: "#fff", color: T.black, fontFamily: SANS,
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: T.muted, fontWeight: 600 }}>Quick select</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button type="button" disabled={bulkSending || visibleUsers.length === 0}
                    onClick={() => setSelectedUserIds(visibleUsers.map((u) => u.id))}
                    className="bz-chip"
                    style={{
                      padding: "7px 12px", borderRadius: 999, border: `1px solid ${T.line}`,
                      background: "#fff", color: T.black, fontFamily: MONO, fontSize: 11, fontWeight: 600,
                    }}>
                    All filtered · {visibleUsers.length}
                  </button>
                  <button type="button" disabled={bulkSending || selectedUserIds.length === 0}
                    onClick={() => setSelectedUserIds([])}
                    className="bz-chip"
                    style={{
                      padding: "7px 12px", borderRadius: 999, border: `1px solid ${T.line}`,
                      background: "#fff", color: T.black, fontFamily: MONO, fontSize: 11, fontWeight: 600,
                    }}>
                    Clear
                  </button>
                </div>
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
                  The eligible audience reached the current 1,000-profile list limit; only the first 1,000 are shown.
                </p>
              </div>
            )}

            <EmailRecipientSelector
              users={visibleUsers}
              selectedIds={selectedUserIds}
              onSelectedIdsChange={setSelectedUserIds}
              disabled={loading || bulkSending || sendingUserId !== null}
            />

            <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: `1px solid ${T.line}`, flexWrap: "wrap" }}>
              <button type="button" className="bz-btn-ghost" onClick={() => setStep(1)} disabled={bulkSending || sendingUserId !== null}
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
                      (occasion · {selectedTemplate.theme})
                    </span>
                  )}
                </div>
                {selectedTemplate && (
                  <div style={{ marginTop: 4, fontFamily: MONO, fontSize: 11, color: T.muted }}>
                    Subject · {selectedTemplate.subject}
                  </div>
                )}
              </li>
              <li style={{ padding: "12px 0", borderBottom: `1px solid ${T.line}` }}>
                <span style={{ fontFamily: MONO, fontSize: 10.5, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Audience</span>
                <div style={{ marginTop: 6, fontSize: 14, color: T.black, fontWeight: 650 }}>
                  {selectedUserIds.length > 0 ? `${selectedUserIds.length} individual recipient(s)` : "—"}
                </div>
              </li>
              <li style={{ padding: "12px 0", borderBottom: `1px solid ${T.line}` }}>
                <span style={{ fontFamily: MONO, fontSize: 10.5, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Delivery plan</span>
                <div style={{ marginTop: 6, fontFamily: MONO, fontSize: 12.5, color: T.ink }}>
                  {selectedUserIds.length > 0
                    ? `${selectedUserIds.length} sequential sends · ~${selectedUserIds.length * 2}s`
                    : "No recipients"}
                </div>
              </li>
              <li style={{ padding: "12px 0" }}>
                <span style={{ fontFamily: MONO, fontSize: 10.5, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Eligibility</span>
                <div style={{ marginTop: 6, fontFamily: MONO, fontSize: 12.5, color: T.ink }}>
                  Active users with marketing consent only · one email per person
                </div>
              </li>
            </ul>

            <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: `1px solid ${T.line}`, flexWrap: "wrap" }}>
              <button type="button" className="bz-btn-ghost" onClick={() => setStep(2)} disabled={bulkSending}
                style={{
                  padding: "11px 18px", border: `1px solid ${T.line}`, borderRadius: 10,
                  background: "#fff", color: T.black, fontFamily: MONO, fontSize: 12, fontWeight: 600,
                }}>
                ← Back to audience
              </button>
              <button type="button" className={bulkSending ? "bz-btn-danger" : "bz-btn"}
                onClick={bulkSending ? cancelBulk : () => void sendBulk()}
                disabled={!bulkSending && !canSend}
                style={{
                  padding: "12px 22px",
                  background: bulkSending ? "#fff" : T.black,
                  color: bulkSending ? T.black : "#fff",
                  border: `1px solid ${T.black}`, borderRadius: 10,
                  fontFamily: MONO, fontSize: 12.5, fontWeight: 700,
                  letterSpacing: "0.06em", textTransform: "uppercase",
                }}>
                {bulkSending ? (cancelling ? "Cancelling…" : "✕ Cancel send (Esc)") : "Send to selected now"}
              </button>
            </div>
          </Panel>

          <Panel eyebrow="Insights" title="Delivery breakdown" delay={0.35}>
            {deliveries.length === 0 ? (
              <div style={{ padding: 26, textAlign: "center", fontSize: 12, color: T.muted, fontFamily: MONO }}>
                No deliveries recorded yet.
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <Donut segments={statusSegments} size={170} centerLabel="TOTAL" centerValue={deliveries.length} />
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

                {templateDeliveries.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <p style={{ margin: "0 0 8px", fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", color: T.muted, fontWeight: 600 }}>
                      Top templates
                    </p>
                    <HBars segments={templateDeliveries.map((t) => ({
                      label: t.label,
                      value: t.value,
                      sub: `${Math.round((t.value / Math.max(deliveries.length, 1)) * 100)}%`,
                    }))} />
                  </div>
                )}
              </>
            )}
          </Panel>
        </section>
      )}

      {/* ============ PER-USER SEND TABLE ============ */}
      {step !== 3 && (
        <section style={{ marginBottom: 16 }}>
          <Panel eyebrow="Individual send" title={`Per-user dispatch · ${visibleUsers.length}`}
            delay={0.4}
            action={
              <span style={{
                fontFamily: MONO, fontSize: 11, color: T.muted,
                border: `1px solid ${T.line}`, borderRadius: 999, padding: "4px 10px",
              }}>
                {users.length} eligible users
              </span>
            }>
            <div style={{ overflowX: "auto", margin: "0 -22px", padding: "0 22px" }}>
              <table className="bz-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Last status for selected template</th>
                    <th>Last sent</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleUsers.map((user) => {
                    const last = selectedTemplate ? lastDeliveryByPair.get(`${user.id}:${selectedTemplate.id}`) : undefined;
                    const tone = last ? statusTone(last.status) : null;
                    const dotColor = tone === "ok" ? T.black : tone === "warn" ? T.gray700 : tone === "bad" ? T.faint : T.faint;
                    return (
                      <tr key={user.id}>
                        <td style={{ fontWeight: 600 }}>{user.display_name || "Unnamed user"}</td>
                        <td className="bz-cell-muted">{user.email}</td>
                        <td>
                          {last ? (
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: 7,
                              fontFamily: MONO, fontSize: 11, fontWeight: 600, color: T.black,
                              textTransform: "uppercase", letterSpacing: "0.06em",
                            }}>
                              <span style={{ width: 6, height: 6, borderRadius: 999, background: dotColor }} />
                              {last.status}
                            </span>
                          ) : (
                            <span className="bz-cell-muted">Not sent</span>
                          )}
                        </td>
                        <td className="bz-cell-muted">{formatDate(last?.sent_at ?? last?.created_at ?? null)}</td>
                        <td style={{ textAlign: "right" }}>
                          <button className="bz-btn-ghost" type="button"
                            disabled={!selectedTemplate || sendingUserId !== null || bulkSending}
                            onClick={() => void sendToUser(user)}
                            style={{
                              padding: "7px 12px", border: `1px solid ${T.line}`, borderRadius: 999,
                              background: "#fff", color: T.black, fontFamily: MONO, fontSize: 11, fontWeight: 600,
                              letterSpacing: "0.04em",
                            }}>
                            {sendingUserId === user.id ? "Sending…" : last?.status === "sent" ? "Send again" : "Send"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {!visibleUsers.length && (
                    <tr><td colSpan={5} style={{ textAlign: "center", color: T.muted, fontFamily: MONO, fontSize: 12, padding: 30 }}>
                      {loading ? "Loading users…" : "No eligible users match your search."}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </section>
      )}

      {/* ============ DELIVERY HISTORY ============ */}
      <section style={{ marginBottom: 24 }}>
        <Panel eyebrow="Audit log" title={`Delivery history · ${visibleDeliveries.length}`}
          delay={0.5}
          action={
            <button type="button" className="bz-btn-ghost" disabled={loading} onClick={() => void load()}
              style={{
                padding: "7px 14px", border: `1px solid ${T.line}`, borderRadius: 999,
                background: "#fff", color: T.black, fontFamily: MONO, fontSize: 11.5, fontWeight: 600,
                letterSpacing: "0.04em",
              }}>
              ↻ Refresh
            </button>
          }>
          <div style={{ overflowX: "auto", margin: "0 -22px", padding: "0 22px" }}>
            <table className="bz-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Template / occasion</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Sent / attempted</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {visibleDeliveries.map((delivery) => {
                  const tone = statusTone(delivery.status);
                  const dotColor = tone === "ok" ? T.black : tone === "warn" ? T.gray700 : T.faint;
                  return (
                    <tr key={delivery.id}>
                      <td style={{ fontWeight: 600 }}>{delivery.recipient_name || "User"}</td>
                      <td className="bz-cell-muted">{delivery.recipient_email}</td>
                      <td>{delivery.template_name}</td>
                      <td>{delivery.subject}</td>
                      <td>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 7,
                          fontFamily: MONO, fontSize: 11, fontWeight: 600, color: T.black,
                          textTransform: "uppercase", letterSpacing: "0.06em",
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: 999, background: dotColor }} />
                          {delivery.status}
                        </span>
                      </td>
                      <td className="bz-cell-muted">{formatDate(delivery.sent_at ?? delivery.created_at)}</td>
                      <td className="bz-cell-muted" style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        title={delivery.error_message ?? ""}>
                        {delivery.error_message || "—"}
                      </td>
                    </tr>
                  );
                })}
                {!visibleDeliveries.length && (
                  <tr><td colSpan={7} style={{ textAlign: "center", color: T.muted, fontFamily: MONO, fontSize: 12, padding: 30 }}>
                    {loading ? "Loading history…" : "No occasion emails have been recorded yet."}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>

      {/* ============ STICKY ACTION BAR ============ */}
      {canSend && !bulkSending && (
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
              {selectedTemplate?.name ?? "—"} · {selectedUserIds.length} recipient{selectedUserIds.length === 1 ? "" : "s"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="bz-btn-ghost" onClick={() => setStep(1)} disabled={bulkSending}
              style={{
                padding: "10px 16px", border: `1px solid ${T.line}`, borderRadius: 10,
                background: "#fff", color: T.black, fontFamily: MONO, fontSize: 12, fontWeight: 600,
              }}>
              Edit
            </button>
            <button type="button" className="bz-btn" onClick={() => void sendBulk()}
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
        <span>BINZEO ADMIN CONSOLE — OCCASION EMAILS v2.0 · WIZARD</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span className="bz-pulse" style={{ width: 6, height: 6, borderRadius: 999, background: T.black }} />
          {users.length.toLocaleString("en-US")} ELIGIBLE · {fmt(deliveries.length)} DELIVERIES · ESC TO CANCEL
        </span>
      </footer>
    </div>
  );
}
