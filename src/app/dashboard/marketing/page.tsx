"use client";

import { useEffect, useMemo, useState } from "react";

type ImageItem = { url: string; position: string };
type Team = { id: string; sector_code: string; sector_name: string };
type EligibleUser = { id: string; email: string; display_name: string | null; date_of_birth: string | null };
type Template = "custom" | "birthday";
type Form = {
  template: Template;
  subject: string;
  preheader: string;
  headline: string;
  message: string;
  button_label: string;
  button_url: string;
  theme: "dark" | "light";
  team_ids: string[];
  selected_user_ids: string[];
  images: ImageItem[];
};

const birthdayDefaults = {
  subject: "Happy Birthday from BINZEO",
  preheader: "A special birthday wish from BINZEO.",
  headline: "Happy Birthday",
  message: "",
  button_label: "Open your BINZEO profile",
};
const initial: Form = { template: "custom", subject: "", preheader: "", headline: "", message: "", button_label: "", button_url: "", theme: "dark", team_ids: [], selected_user_ids: [], images: [] };
const positions = [{ value: "top", label: "Top" }, { value: "after_headline", label: "After headline" }, { value: "after_message", label: "After message" }, { value: "before_button", label: "Before button" }];

export default function MarketingPage() {
  const [form, setForm] = useState<Form>(initial);
  const [preview, setPreview] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [working, setWorking] = useState(false);
  const [uploading, setUploading] = useState<number | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<EligibleUser[]>([]);
  const [userSearch, setUserSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/marketing").then((response) => response.json()).then((json) => {
      const data = json.data ?? json;
      setCount(data.recipient_count ?? null);
      setTeams(data.teams ?? []);
      setUsers(data.users ?? []);
    }).catch(() => setStatus("Could not load marketing recipients."));
  }, []);

  const selectedUsers = useMemo(() => users.filter((user) => form.selected_user_ids.includes(user.id)), [users, form.selected_user_ids]);
  const visibleUsers = useMemo(() => {
    const needle = userSearch.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((user) => `${user.display_name ?? ""} ${user.email}`.toLowerCase().includes(needle));
  }, [users, userSearch]);

  function update<K extends keyof Form>(key: K, value: Form[K]) { setForm((current) => ({ ...current, [key]: value })); setPreview(""); }
  function selectTemplate(template: Template) {
    if (template === "birthday") setForm((current) => ({ ...current, template, ...birthdayDefaults, button_url: current.button_url || "https://auth-binzeo.vercel.app/dashboard/profile" }));
    else setForm((current) => ({ ...current, template }));
    setPreview("");
  }
  function updateImage(index: number, key: keyof ImageItem, value: string) { const images = [...form.images]; images[index] = { ...images[index], [key]: value }; update("images", images); }
  function toggleUser(id: string, checked: boolean) { update("selected_user_ids", checked ? [...form.selected_user_ids, id] : form.selected_user_ids.filter((selectedId) => selectedId !== id)); }
  async function uploadImage(index: number, file: File) {
    setUploading(index); setStatus("");
    const body = new FormData(); body.append("file", file);
    const response = await fetch("/api/admin/marketing/image", { method: "POST", body });
    const json = await response.json(); const data = json.data ?? json;
    if (!response.ok) setStatus(json.error?.message ?? json.error ?? "Image upload failed");
    else { updateImage(index, "url", data.url); setStatus(`Image ${index + 1} uploaded through auth.binzeo ImageKit.`); }
    setUploading(null);
  }
  async function previewEmail() {
    setWorking(true); setStatus("");
    const response = await fetch("/api/admin/marketing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, action: "preview" }) });
    const json = await response.json(); const data = json.data ?? json;
    if (!response.ok) setStatus(json.error?.message ?? json.error ?? "Preview failed");
    else { setPreview(data.html); setCount(data.recipient_count); setStatus("Preview updated. No email was sent."); }
    setWorking(false);
  }
  async function sendEmail() {
    if (!preview) { setStatus("Preview the email before sending."); return; }
    const target = form.selected_user_ids.length ? `${form.selected_user_ids.length} selected user${form.selected_user_ids.length === 1 ? "" : "s"}` : (count ?? 0) + " eligible users";
    if (!window.confirm(`Send this ${form.template === "birthday" ? "birthday" : "marketing"} email to ${target}?`)) return;
    setWorking(true); setStatus("");
    const response = await fetch("/api/admin/marketing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, action: "send" }) });
    const json = await response.json(); const data = json.data ?? json;
    setStatus(response.ok ? `Email complete: ${data.sent} sent, ${data.failed} failed.` : (json.error?.message ?? json.error ?? "Send failed"));
    setWorking(false);
  }

  return <div className="content">
    <div className="section-head"><div><p className="eyebrow">Communications / direct send</p><h2>Marketing emails</h2><p className="muted">Choose a template, select individual eligible users or a team, preview the personalized email, then send directly.</p></div><span className="badge good">{count === null ? "Loading…" : `${count} eligible users`}</span></div>
    <div className="marketing-grid">
      <section className="card">
        <p className="eyebrow">Template and recipients</p>
        <label className="field-label">Email template<select className="input" value={form.template} onChange={(event) => selectTemplate(event.target.value as Template)}><option value="custom">Custom marketing email</option><option value="birthday">Birthday wishes</option></select></label>
        {form.template === "birthday" && <p className="protected-note">Birthday template uses the same BINZEO design and automatically personalizes “Hey [name]”. Select one or more eligible users below.</p>}
        <label className="field-label">Specific users <span className="muted">Optional: selected users override team targeting</span><input className="input" placeholder="Search by name or email" value={userSearch} onChange={(event) => setUserSearch(event.target.value)} /></label>
        <div className="recipient-picker">{visibleUsers.map((user) => <label className="team-option" key={user.id}><input type="checkbox" checked={form.selected_user_ids.includes(user.id)} onChange={(event) => toggleUser(user.id, event.target.checked)} /><span><strong>{user.display_name || "Unnamed user"}</strong><br /><span className="muted">{user.email}{user.date_of_birth ? ` · birthday ${user.date_of_birth}` : ""}</span></span></label>)}{!visibleUsers.length && <span className="muted">No eligible active users found.</span>}</div>
        {selectedUsers.length > 0 && <p className="muted">Selected: {selectedUsers.map((user) => user.display_name || user.email).join(", ")}</p>}
        <div className="field-label">Teams / sectors <span className="muted">Used only when no specific users are selected</span><div className="team-picker">{teams.map((team) => <label className="team-option" key={team.id}><input type="checkbox" checked={form.team_ids.includes(team.id)} disabled={form.selected_user_ids.length > 0} onChange={(event) => update("team_ids", event.target.checked ? [...form.team_ids, team.id] : form.team_ids.filter((id) => id !== team.id))} />{team.sector_name}</label>)}</div></div>
        <p className="eyebrow" style={{ marginTop: 18 }}>Design</p>
        <label className="field-label">Theme<select className="input" value={form.theme} onChange={(event) => update("theme", event.target.value as Form["theme"])}><option value="dark">Dark · black background / white text</option><option value="light">Light · white background / black text</option></select></label>
        <label className="field-label">Subject<input className="input" value={form.subject} onChange={(event) => update("subject", event.target.value)} maxLength={180} /></label>
        <label className="field-label">Preheader<input className="input" value={form.preheader} onChange={(event) => update("preheader", event.target.value)} maxLength={240} /></label>
        <label className="field-label">Headline<input className="input" value={form.headline} onChange={(event) => update("headline", event.target.value)} maxLength={180} /></label>
        <label className="field-label">Message<textarea className="input" rows={8} value={form.message} onChange={(event) => update("message", event.target.value)} maxLength={10000} placeholder={form.template === "birthday" ? "Leave blank to use the personalized birthday message." : "Write your message"} /></label>
        <div className="two-col"><label className="field-label">Button label<input className="input" value={form.button_label} onChange={(event) => update("button_label", event.target.value)} /></label><label className="field-label">Button URL<input className="input" type="url" value={form.button_url} onChange={(event) => update("button_url", event.target.value)} /></label></div>
        <p className="eyebrow" style={{ marginTop: 18 }}>Images · {form.images.length}/8</p>
        {form.images.map((image, index) => <div className="image-slot" key={`${index}-${image.url}`}><strong>Image {index + 1}</strong><input className="input" type="url" placeholder="https://cdn.example.com/image.jpg" value={image.url} onChange={(event) => updateImage(index, "url", event.target.value)} /><input className="input" type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploading !== null} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(index, file); event.currentTarget.value = ""; }} /><select className="input" value={image.position} onChange={(event) => updateImage(index, "position", event.target.value)}>{positions.map((position) => <option key={position.value} value={position.value}>{position.label}</option>)}</select><button className="btn light" type="button" onClick={() => update("images", form.images.filter((_, imageIndex) => imageIndex !== index))}>Remove image</button>{uploading === index && <span className="muted">Uploading through auth.binzeo ImageKit…</span>}</div>)}
        <button className="btn light" type="button" disabled={form.images.length >= 8} onClick={() => update("images", [...form.images, { url: "", position: "after_message" }])}>+ Add image</button>
        <div className="actions"><button className="btn light" type="button" onClick={() => void previewEmail()} disabled={working || uploading !== null}>{working ? "Working…" : "Preview email"}</button><button className="btn" type="button" onClick={() => void sendEmail()} disabled={working || uploading !== null || !preview}>{form.template === "birthday" ? "Send birthday email" : "Send directly"}</button></div>
        {status && <p className="muted" role="status">{status}</p>}
      </section>
      <section className="card"><div className="section-head"><div><p className="eyebrow">Stable preview</p><h3 style={{ margin: "5px 0" }}>{preview ? form.subject || (form.template === "birthday" ? "Happy Birthday from BINZEO" : "Marketing email") : "Nothing previewed yet"}</h3></div><span className="badge">{count ?? "—"} recipients</span></div>{preview ? <div className="email-preview-render" dangerouslySetInnerHTML={{ __html: preview }} /> : <div className="preview-empty muted">Preview will stay on this page and will not reload.</div>}</section>
    </div>
    <p className="protected-note" style={{ marginTop: 18 }}><strong>Consent gate:</strong> only active users with <code>marketing_email = true</code> appear in the picker and can receive a direct or birthday email. The recipient’s display name is inserted automatically.</p>
  </div>;
}
