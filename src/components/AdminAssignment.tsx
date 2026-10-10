"use client";

import { useEffect, useMemo, useState } from "react";

type Candidate = { id: string; binzeo_user_id: string | null; display_name: string | null; username: string | null; account_status: string | null };
type Assignment = { user_id: string; roles: string[]; is_active: boolean };

export default function AdminAssignment() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selected, setSelected] = useState("");
  const [role, setRole] = useState("support_admin");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const response = await fetch("/api/admin/admins", { cache: "no-store" });
    const json = await response.json();
    if (!response.ok) setMessage({ type: "error", text: json.error ?? "Could not load users" });
    else { setCandidates(json.data?.candidates ?? []); setAssignments(json.data?.assignments ?? []); }
    setLoading(false);
  }
  useEffect(() => {
    let mounted = true;
    fetch("/api/admin/admins", { cache: "no-store" }).then(async (response) => {
      const json = await response.json();
      if (!mounted) return;
      if (!response.ok) setMessage({ type: "error", text: json.error ?? "Could not load users" });
      else { setCandidates(json.data?.candidates ?? []); setAssignments(json.data?.assignments ?? []); }
      setLoading(false);
    }).catch(() => { if (mounted) { setMessage({ type: "error", text: "Could not load users" }); setLoading(false); } });
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return candidates.filter((candidate) => {
      const searchable = `${candidate.display_name ?? ""} ${candidate.username ?? ""} ${candidate.binzeo_user_id ?? ""}`.toLowerCase();
      return !needle || searchable.includes(needle);
    });
  }, [candidates, query]);

  async function assign() {
    if (!selected) return;
    setSaving(true); setMessage(null);
    const response = await fetch("/api/admin/admins", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: selected, role }) });
    const json = await response.json();
    if (!response.ok) setMessage({ type: "error", text: json.error ?? "Could not assign admin" });
    else { setMessage({ type: "success", text: "Admin access assigned successfully." }); setSelected(""); await load(); }
    setSaving(false);
  }

  return <div className="card" style={{ marginTop: 18 }}>
    <div className="section-head" style={{ marginBottom: 14 }}><div><p className="eyebrow">Super admin control</p><h3 style={{ margin: "5px 0" }}>Add an administrator</h3><p className="muted">Select an existing user. Passwords and authentication settings are not changed.</p></div><span className="badge warn">super admin only</span></div>
    {message && <p className={message.type === "error" ? "error" : "muted"}>{message.text}</p>}
    <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr) 180px auto", alignItems: "end" }}>
      <label className="form-grid" style={{ maxWidth: "none", gap: 7 }}><span className="muted" style={{ fontSize: 12, fontWeight: 700 }}>User</span><select className="input" value={selected} onChange={(event) => setSelected(event.target.value)} disabled={loading}><option value="">{loading ? "Loading users…" : "Choose a user"}</option>{filtered.filter((candidate) => !assignments.some((item) => item.user_id === candidate.id && item.is_active)).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.display_name || candidate.username || candidate.binzeo_user_id || candidate.id}</option>)}</select></label>
      <label className="form-grid" style={{ maxWidth: "none", gap: 7 }}><span className="muted" style={{ fontSize: 12, fontWeight: 700 }}>Role</span><select className="input" value={role} onChange={(event) => setRole(event.target.value)}><option value="support_admin">Support admin</option><option value="auditor">Auditor</option></select></label>
      <button className="btn" type="button" onClick={() => void assign()} disabled={!selected || saving}>{saving ? "Saving…" : "Add admin"}</button>
    </div>
    <input className="input" style={{ marginTop: 14, maxWidth: 360 }} placeholder="Filter users by name or BINZEO ID" value={query} onChange={(event) => setQuery(event.target.value)} />
  </div>;
}
