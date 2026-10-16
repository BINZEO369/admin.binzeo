"use client";

import { useMemo, useState } from "react";

type Sector = { id: string; sector_code: string; sector_name: string; description: string | null; is_active: boolean; created_at: string };
type Notice = { type: "success" | "error"; text: string };

export default function SectorManager({ initialSectors }: { initialSectors: Sector[] }) {
  const [sectors, setSectors] = useState(initialSectors);
  const [editing, setEditing] = useState<Sector | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const activeCount = useMemo(() => sectors.filter((sector) => sector.is_active).length, [sectors]);

  function reset() {
    setEditing(null); setCode(""); setName(""); setDescription(""); setIsActive(true);
  }
  function startEdit(sector: Sector) {
    setEditing(sector); setCode(sector.sector_code); setName(sector.sector_name); setDescription(sector.description ?? ""); setIsActive(sector.is_active); setNotice(null);
  }
  async function save() {
    setSaving(true); setNotice(null);
    try {
      const response = await fetch(editing ? `/api/admin/settings/sectors?id=${editing.id}` : "/api/admin/settings/sectors", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sector_code: code, sector_name: name, description: description || null, is_active: isActive }),
      });
      const result = await response.json();
      if (!response.ok) { setNotice({ type: "error", text: result.error?.message ?? result.error ?? "Could not save sector." }); return; }
      const next = result.data.sector as Sector;
      setSectors((current) => editing ? current.map((item) => item.id === next.id ? next : item) : [...current, next].sort((a, b) => a.sector_name.localeCompare(b.sector_name)));
      setNotice({ type: "success", text: editing ? "Sector updated." : "Sector created." });
      reset();
    } catch { setNotice({ type: "error", text: "Could not save sector." }); }
    finally { setSaving(false); }
  }
  async function remove(sector: Sector) {
    if (!window.confirm(`Deactivate “${sector.sector_name}”? Existing user memberships will be preserved.`)) return;
    setSaving(true); setNotice(null);
    try {
      const response = await fetch(`/api/admin/settings/sectors?id=${sector.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) { setNotice({ type: "error", text: result.error?.message ?? result.error ?? "Could not deactivate sector." }); return; }
      const next = result.data.sector as Sector;
      setSectors((current) => current.map((item) => item.id === next.id ? next : item));
      setNotice({ type: "success", text: "Sector deactivated. Existing memberships were preserved." });
    } catch { setNotice({ type: "error", text: "Could not deactivate sector." }); }
    finally { setSaving(false); }
  }
  async function restore(sector: Sector) {
    setSaving(true); setNotice(null);
    try {
      const response = await fetch(`/api/admin/settings/sectors?id=${sector.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: true }) });
      const result = await response.json();
      if (!response.ok) { setNotice({ type: "error", text: result.error?.message ?? result.error ?? "Could not restore sector." }); return; }
      const next = result.data.sector as Sector;
      setSectors((current) => current.map((item) => item.id === next.id ? next : item));
      setNotice({ type: "success", text: "Sector restored." });
    } catch { setNotice({ type: "error", text: "Could not restore sector." }); }
    finally { setSaving(false); }
  }

  return <section className="card" style={{ marginTop: 18 }}>
    <div className="section-head"><div><p className="eyebrow">Reference data</p><h2 style={{ margin: "5px 0" }}>Sectors</h2><p className="muted">Create, edit, activate or deactivate business sectors. Deactivation preserves existing user memberships.</p></div><span className="badge good">{activeCount} active</span></div>
    {notice && <p className={notice.type === "error" ? "error" : "protected-note"} role="status">{notice.text}</p>}
    <div className="admin-settings-grid" style={{ alignItems: "start" }}>
      <div className="card" style={{ boxShadow: "none", background: "var(--surface-2, #f8fafc)" }}>
        <p className="eyebrow">{editing ? "Edit sector" : "Add sector"}</p>
        <label className="field-label">Code<input className="input" value={code} onChange={(event) => setCode(event.target.value.toLowerCase())} placeholder="fashion_apparel" maxLength={50} disabled={Boolean(editing)} /></label>
        <label className="field-label">Name<input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Fashion & Apparel" maxLength={100} /></label>
        <label className="field-label">Description<textarea className="input" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Short description" maxLength={500} rows={3} /></label>
        <label className="muted" style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}><input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} /> Active</label>
        <div className="actions" style={{ marginTop: 14 }}><button className="btn" type="button" onClick={() => void save()} disabled={saving || code.length < 2 || name.trim().length < 2}>{saving ? "Saving…" : editing ? "Save changes" : "Add sector"}</button>{editing && <button className="btn light" type="button" onClick={reset} disabled={saving}>Cancel</button>}</div>
      </div>
      <div style={{ display: "grid", gap: 9 }}>{sectors.map((sector) => <article className="card" key={sector.id} style={{ boxShadow: "none", padding: 13 }}><div className="section-head" style={{ marginBottom: 5 }}><div><strong>{sector.sector_name}</strong><p className="muted" style={{ margin: "4px 0", fontSize: 12 }}>{sector.sector_code}</p></div><span className={`badge ${sector.is_active ? "good" : "warn"}`}>{sector.is_active ? "Active" : "Inactive"}</span></div>{sector.description && <p className="muted" style={{ margin: "5px 0", fontSize: 12 }}>{sector.description}</p>}<div className="actions" style={{ marginTop: 9 }}><button className="btn light" type="button" onClick={() => startEdit(sector)} disabled={saving}>Edit</button>{sector.is_active ? <button className="btn light" type="button" onClick={() => void remove(sector)} disabled={saving}>Deactivate</button> : <button className="btn light" type="button" onClick={() => void restore(sector)} disabled={saving}>Restore</button>}</div></article>)}</div>
    </div>
  </section>;
}
