"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import EmailRecipientSelector, { type EmailRecipient } from "@/components/EmailRecipientSelector";

type User = EmailRecipient;
type Team = { id: string; sector_name: string };
type Template = { id: string; name: string; template_type: "birthday" | "marketing" | "occasion"; theme: string };
const BATCH_SIZE = 20;

/* ================= TOKENS ================= */
const T = {
  black: "#0A0A0A", ink: "#171717", gray700: "#404040", muted: "#737373",
  faint: "#A3A3A3", gray300: "#D4D4D4", line: "#E5E5E5", soft: "#F5F5F5",
  canvas: "#FAFAFA", surface: "#FFFFFF",
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
  @keyframes bzPulse  { 0%,100% { opacity: 1; } 50% { opacity: .28; } }
  @keyframes bzSpin   { to { transform: rotate(360deg); } }
  @keyframes bzShimmer{ from { background-position: -200% 0; } to { background-position: 200% 0; } }

  .bz-spark-line { stroke-dasharray: 500; stroke-dashoffset: 500; animation: bzDraw 1s cubic-bezier(.4,0,.2,1) forwards; }
  .bz-spark-area { opacity: 0; animation: bzFadeIn .7s ease-out .3s forwards; }
  .bz-spark-dot { transform-box: fill-box; transform-origin: center; opacity: 0; animation: bzPop .35s ease-out 1s forwards; }
  .bz-bar-rect { transform-box: fill-box; transform-origin: bottom; transform: scaleY(0); animation: bzGrowY .8s cubic-bezier(.2,.7,.2,1) forwards; }
  .bz-hbar { transform-box: fill-box; transform-origin: left; transform: scaleX(0); animation: bzGrowX .9s cubic-bezier(.2,.7,.2,1) forwards; }
  .bz-donut-seg { opacity: 0; animation: bzFadeIn .8s ease-out forwards; }
  .bz-fade-up { opacity: 0; animation: bzRiseUp .55s cubic-bezier(.2,.7,.2,1) forwards; }
  .bz-number { display: inline-block; opacity: 0; animation: bzRiseUp .5s ease-out forwards; }
  .bz-pulse { animation: bzPulse 2.2s ease-in-out infinite; }
  .bz-spin { animation: bzSpin .9s linear infinite; }
  .bz-card { transition: transform .22s cubic-bezier(.2,.7,.2,1), border-color .22s ease, box-shadow .22s ease; }
  .bz-card:hover { transform: translateY(-2px); border-color: ${T.black}; box-shadow: 0 14px 32px -22px rgba(0,0,0,.24); }
  .bz-team { transition: background .18s ease, border-color .18s ease; cursor: pointer; user-select: none; }
  .bz-team:hover { border-color: ${T.black} !important; }
  .bz-team.on { background: ${T.black} !important; color: #fff !important; border-color: ${T.black} !important; }
  .bz-team.on .bz-team-dot { background: #fff !important; }
  .bz-team.disabled { opacity: .45; cursor: not-allowed; }
  .bz-select { appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='none' stroke='%23737373' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' d='M1 1.5l5 5 5-5'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; padding-right: 34px !important; cursor: pointer; }
  .bz-select:focus { outline: none; border-color: ${T.black} !important; box-shadow: 0 0 0 3px rgba(10,10,10,.08); }
  .bz-btn { transition: background .18s ease, color .18s ease, border-color .18s ease, transform .12s ease; cursor: pointer; }
  .bz-btn:hover:not(:disabled) { background: ${T.gray700} !important; border-color: ${T.gray700} !important; transform: translateY(-1px); }
  .bz-btn:disabled { opacity: .45; cursor: not-allowed; }
  .bz-btn-ghost { transition: background .18s ease, color .18s ease, border-color .18s ease; cursor: pointer; text-decoration: none; }
  .bz-btn-ghost:hover { background: ${T.black} !important; color: #fff !important; border-color: ${T.black} !important; }

  .bz-grid-kpi { grid-template-columns: repeat(4, 1fr); }
  .bz-grid-2 { grid-template-columns: 1.15fr 1fr; }
  .bz-grid-3 { grid-template-columns: 1fr 1fr 1fr; }
  @media (max-width:1200px){
    .bz-grid-kpi{grid-template-columns:repeat(2,1fr)!important}
    .bz-grid-3{grid-template-columns:1fr 1fr!important}
  }
  @media (max-width:1100px){
    .bz-grid-2{grid-template-columns:1fr!important}
  }
  @media (max-width:640px){
    .bz-grid-kpi,.bz-grid-3{grid-template-columns:1fr!important}
  }
  @media (prefers-reduced-motion: reduce){
    .bz-spark-line,.bz-spark-area,.bz-spark-dot,.bz-bar-rect,.bz-hbar,.bz-donut-seg,.bz-fade-up,.bz-number{
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
              <span style={{ fontSize: 12, color: T.ink, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {s.label}
              </span>
              <span style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 700, color: T.black, flexShrink: 0 }}>
                {s.sub ? `${s.sub} · ` : ""}{s.value.toLocaleString("en-US")}
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

/* ================= UI: Panel ================= */
function Panel({ title, eyebrow, action, children, delay = 0 }: {
  title: string; eyebrow?: string; action?: React.ReactNode; children: React.ReactNode; delay?: number;
}) {
  return (
    <div className="bz-fade-up" style={{
      background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16, padding: 22,
      display: "flex", flexDirection: "column", gap: 16, minWidth: 0,
      animationDelay: `${delay}s`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
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

  async function sendBatch(recipientIds: string[], selectedTemplate: Template) {
    const response = await fetch("/api/admin/marketing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send", template_id: selectedTemplate.id, template: selectedTemplate.template_type, selected_user_ids: recipientIds, team_ids: [] }),
    });
    const json = await response.json();
    const data = json.data ?? json;
    if (!response.ok) throw new Error(json.error?.message ?? "Send failed.");
    return { sent: Number(data.sent ?? 0), failed: Number(data.failed ?? 0), skipped: Number(data.skipped ?? 0) };
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
    let sent = 0;
    let failed = 0;
    let skipped = 0;
    let completedBatches = 0;
    try {
      if (selectedUsers.length) {
        const batches = Array.from({ length: Math.ceil(selectedUsers.length / BATCH_SIZE) }, (_, index) => selectedUsers.slice(index * BATCH_SIZE, (index + 1) * BATCH_SIZE));
        for (let index = 0; index < batches.length; index += 1) {
          const batch = batches[index];
          setStatus(`Sending batch ${index + 1} of ${batches.length} (${sent} sent so far)…`);
          const result = await sendBatch(batch, template);
          sent += result.sent; failed += result.failed; skipped += result.skipped; completedBatches += 1;
          setSelectedUsers((current) => current.filter((id) => !batch.includes(id)));
        }
        setStatus(`Email complete: ${sent} sent, ${failed} failed, ${skipped} skipped across ${completedBatches} logged campaign batch(es).`);
        setLastResult({ sent, failed, skipped });
      } else {
        setStatus("Sending to selected teams…");
        const response = await fetch("/api/admin/marketing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "send", template_id: templateId, template: template.template_type, selected_user_ids: [], team_ids: teamIds }),
        });
        const json = await response.json();
        const data = json.data ?? json;
        if (!response.ok) { setStatus(json.error?.message ?? "Send failed."); return; }
        setStatus(`Email complete: ${data.sent ?? 0} sent, ${data.failed ?? 0} failed, ${data.skipped ?? 0} skipped.`);
        setLastResult({ sent: Number(data.sent ?? 0), failed: Number(data.failed ?? 0), skipped: Number(data.skipped ?? 0) });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "The send request did not complete.";
      setStatus(`Stopped after ${sent} sent, ${failed} failed and ${skipped} skipped. ${message} Check the campaign delivery records before retrying.`);
      setLastResult({ sent, failed, skipped });
    } finally {
      setWorking(false);
    }
  }

  /* -------- derived (all real) -------- */
  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId) ?? null,
    [templates, templateId]
  );

  const marketingTemplates = templates.filter((t) => t.template_type === "marketing").length;
  const birthdayTemplates = templates.filter((t) => t.template_type === "birthday").length;

  const audienceSize = selectedUsers.length > 0
    ? selectedUsers.length
    : teamIds.length > 0
      ? users.filter((u) => {
          const anyTeam = u as unknown as { sector_ids?: string[] };
          return Array.isArray(anyTeam.sector_ids) && anyTeam.sector_ids.some((s) => teamIds.includes(s));
        }).length
      : 0;

  /* language distribution of eligible users (real) */
  const langMap = new Map<string, number>();
  users.forEach((u) => {
    const raw = (u as unknown as { preferred_language?: string | null }).preferred_language;
    const k = (raw ?? "").trim().toLowerCase() || "unknown";
    langMap.set(k, (langMap.get(k) ?? 0) + 1);
  });
  const langSegments = Array.from(langMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  const otherLangs = langSegments.slice(3).reduce((s, c) => s + c.value, 0);
  const donutSegments = otherLangs > 0
    ? [...langSegments.slice(0, 3), { label: "Other", value: otherLangs }]
    : langSegments.slice(0, 4);

  /* country distribution (real) */
  const countryMap = new Map<string, number>();
  users.forEach((u) => {
    const raw = (u as unknown as { country_code?: string | null }).country_code;
    const k = (raw ?? "").trim().toUpperCase() || "UNKNOWN";
    countryMap.set(k, (countryMap.get(k) ?? 0) + 1);
  });
  const topCountries = Array.from(countryMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const kpis = [
    { label: "Eligible users", value: users.length, detail: audienceTruncated ? "Capped at 1,000" : "All opted-in active users", spark: undefined as number[] | undefined },
    { label: "Teams / sectors", value: teams.length, detail: teams.length > 0 ? "Ready for team send" : "No teams loaded" },
    { label: "Templates", value: templates.length, detail: `${marketingTemplates} marketing · ${birthdayTemplates} birthday` },
    { label: "Selected", value: audienceSize, detail: selectedUsers.length > 0 ? `${selectedUsers.length} individual` : teamIds.length > 0 ? `${teamIds.length} team(s)` : "Nothing selected" },
  ];

  const loading = status.startsWith("Loading");

  return (
    <div style={{ background: T.canvas, minHeight: "100%", padding: "32px clamp(20px, 4vw, 48px) 80px", color: T.ink, fontFamily: SANS }}>
      <style>{ANIM_CSS}</style>

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
            <span style={{
              width: 26, height: 26, borderRadius: 8, background: T.black, color: "#fff",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700,
            }}>B</span>
            <span style={{ fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: MONO }}>
              Communications · Send only
            </span>
          </div>
          <h1 style={{ margin: "0 0 10px", fontSize: "clamp(26px, 3.2vw, 38px)", lineHeight: 1.05, fontWeight: 700, letterSpacing: "-0.035em", color: T.black }}>
            Marketing emails
          </h1>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: T.muted, maxWidth: 660 }}>
            Choose a saved central template and filter eligible profiles. Email editing lives in the templates section — this view is for sending only.
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

      {/* ============ STATUS BANNER ============ */}
      {status && (
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
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: T.ink, fontFamily: MONO }}>
            {status}
          </p>
        </div>
      )}

      {/* ============ RESULT SUMMARY (only after a send) ============ */}
      {lastResult && (
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
              <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: T.muted, fontWeight: 600 }}>
                {r.label}
              </span>
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

      {/* ============ MAIN GRID ============ */}
      <section className="bz-grid-2" style={{ display: "grid", gap: 16, marginBottom: 16 }}>
        {/* -------- LEFT: Template + teams -------- */}
        <Panel eyebrow="Step 1" title="Choose template & teams" delay={0.3}>
          {/* Template select */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", color: T.muted, fontWeight: 600 }}>
              Saved template
            </label>
            <select
              className="bz-select"
              value={templateId}
              onChange={(event) => setTemplateId(event.target.value)}
              disabled={working || loading}
              style={{
                width: "100%", padding: "12px 14px", fontSize: 13.5,
                border: `1px solid ${T.line}`, borderRadius: 10,
                background: "#fff", color: T.black, fontFamily: SANS,
                transition: "border-color .18s ease",
              }}
            >
              <option value="">Select a saved template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} · {template.template_type} · {template.theme}
                </option>
              ))}
            </select>
            {selectedTemplate && (
              <div className="bz-fade-up" style={{
                display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4,
              }}>
                <span style={{
                  fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600,
                  fontFamily: MONO, color: "#fff", background: T.black,
                  border: `1px solid ${T.black}`, borderRadius: 999, padding: "3px 10px",
                }}>
                  {selectedTemplate.template_type}
                </span>
                <span style={{
                  fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600,
                  fontFamily: MONO, color: T.black, background: "#fff",
                  border: `1px solid ${T.line}`, borderRadius: 999, padding: "3px 10px",
                }}>
                  theme · {selectedTemplate.theme}
                </span>
              </div>
            )}
          </div>

          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: T.muted }}>
            To create or edit birthday and marketing email designs, use{" "}
            <Link href="/dashboard/templates" style={{ color: T.black, textDecoration: "underline", textUnderlineOffset: 3 }}>
              Central Email Templates
            </Link>.
          </p>

          {/* Teams */}
          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", color: T.muted, fontWeight: 600 }}>
                Teams / sectors
              </span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: T.faint }}>
                {selectedUsers.length > 0 ? "disabled while users are selected" : teamIds.length > 0 ? `${teamIds.length} chosen` : "optional"}
              </span>
            </div>

            {teams.length === 0 ? (
              <div style={{
                padding: "18px 14px", textAlign: "center",
                border: `1px dashed ${T.line}`, borderRadius: 10,
                fontFamily: MONO, fontSize: 12, color: T.muted,
              }}>
                No teams available for targeting.
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {teams.map((team, i) => {
                  const on = teamIds.includes(team.id);
                  const disabled = working || selectedUsers.length > 0;
                  return (
                    <button
                      key={team.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => setTeamIds((current) =>
                        current.includes(team.id)
                          ? current.filter((value) => value !== team.id)
                          : [...current, team.id]
                      )}
                      className={`bz-team bz-fade-up ${on ? "on" : ""} ${disabled ? "disabled" : ""}`}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 8,
                        padding: "8px 12px", border: `1px solid ${T.line}`, borderRadius: 999,
                        background: on ? T.black : "#fff", color: on ? "#fff" : T.black,
                        fontFamily: MONO, fontSize: 11.5, fontWeight: 600, letterSpacing: "0.02em",
                        animationDelay: `${0.35 + i * 0.03}s`,
                      }}
                    >
                      <span className="bz-team-dot" style={{
                        width: 6, height: 6, borderRadius: 999,
                        background: on ? "#fff" : T.black,
                      }} />
                      {team.sector_name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Send button */}
          <div style={{
            display: "flex", flexDirection: "column", gap: 12,
            paddingTop: 16, marginTop: 8, borderTop: `1px solid ${T.line}`,
          }}>
            <button
              className="bz-btn"
              type="button"
              disabled={working || (!selectedUsers.length && !teamIds.length) || !templateId}
              onClick={() => void send()}
              style={{
                width: "100%", padding: "14px 18px",
                fontSize: 13.5, fontWeight: 700, fontFamily: MONO, letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#fff", background: T.black, border: `1px solid ${T.black}`,
                borderRadius: 12,
              }}
            >
              {working
                ? "Sending…"
                : selectedUsers.length
                  ? `Send to ${selectedUsers.length} selected`
                  : teamIds.length
                    ? `Send to ${teamIds.length} team${teamIds.length > 1 ? "s" : ""}`
                    : "Send"}
            </button>
            <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.6, color: T.muted, fontFamily: MONO }}>
              Large individual selections run in safe batches of {BATCH_SIZE}. Each batch is separately recorded in campaign history.
            </p>
          </div>
        </Panel>

        {/* -------- RIGHT: Recipients -------- */}
        <Panel
          eyebrow="Step 2"
          title="Select recipients"
          delay={0.35}
          action={
            <span style={{
              fontFamily: MONO, fontSize: 11, fontWeight: 600,
              color: T.black, background: "#fff",
              border: `1px solid ${T.line}`, borderRadius: 999, padding: "4px 10px",
            }}>
              {selectedUsers.length > 0 ? `${selectedUsers.length} selected` : "audience"}
            </span>
          }
        >
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: T.muted }}>
            Only active users who allowed <strong style={{ color: T.black }}>Marketing emails</strong> are listed. Select all eligible users or combine filters for a targeted group.
          </p>

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
                The eligible audience reached the current 1,000-profile list limit. The selector contains only the first 1,000; narrow or paginate the audience before sending.
              </p>
            </div>
          )}

          <EmailRecipientSelector
            users={users}
            selectedIds={selectedUsers}
            onSelectedIdsChange={setSelectedUsers}
            disabled={working}
          />
        </Panel>
      </section>

      {/* ============ ANALYTICS ROW ============ */}
      <section className="bz-grid-3" style={{ display: "grid", gap: 16, marginBottom: 16 }}>
        <Panel eyebrow="Audience language" title="Language mix" delay={0.4}>
          {donutSegments.length === 0 ? (
            <div style={{ padding: 26, textAlign: "center", fontSize: 12, color: T.muted, fontFamily: MONO }}>No language data</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <Donut segments={donutSegments} size={170} centerLabel="USERS" centerValue={users.length} />
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
          action={<span style={{ fontFamily: MONO, fontSize: 11, color: T.muted, border: `1px solid ${T.line}`, borderRadius: 999, padding: "4px 10px" }}>{countryMap.size} total</span>}>
          {topCountries.length === 0 ? (
            <div style={{ padding: 26, textAlign: "center", fontSize: 12, color: T.muted, fontFamily: MONO }}>No country data</div>
          ) : (
            <HBars segments={topCountries.map((c) => ({
              label: c.label,
              value: c.value,
              sub: `${Math.round((c.value / Math.max(users.length, 1)) * 100)}%`,
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
                    background: r.ok ? T.black : "#fff",
                    border: `1px solid ${T.black}`,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    color: r.ok ? "#fff" : T.black, fontSize: 10, fontWeight: 700,
                    flexShrink: 0,
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

      {/* ============ FOOTER ============ */}
      <footer style={{
        marginTop: 40, paddingTop: 20, borderTop: `1px solid ${T.line}`,
        display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "center",
        fontFamily: MONO, fontSize: 11, color: T.faint, letterSpacing: "0.04em",
      }}>
        <span>BINZEO ADMIN CONSOLE — MARKETING v2.0</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span className="bz-pulse" style={{ width: 6, height: 6, borderRadius: 999, background: T.black }} />
          SEND-ONLY MODE · {users.length.toLocaleString("en-US")} ELIGIBLE
        </span>
      </footer>
    </div>
  );
}
