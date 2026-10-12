"use client";

import { useEffect, useMemo, useState } from "react";
import { ADMIN_PERMISSION_OPTIONS, ADMIN_ROLE_OPTIONS, defaultPermissionsForRoles } from "@/lib/admin-permissions";

type Candidate = { id: string; email: string | null; binzeo_user_id: string | null; display_name: string | null; username: string | null; account_status: string | null };
type Assignment = { user_id: string; roles: string[]; permissions: string[]; is_active: boolean; assigned_by: string | null; updated_at: string | null };
type Notice = { type: "success" | "error"; text: string };

export default function AdminAssignment() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selected, setSelected] = useState("");
  const [roles, setRoles] = useState<string[]>(["support_admin"]);
  const [permissions, setPermissions] = useState<string[]>(defaultPermissionsForRoles(["support_admin"]));
  const [isActive, setIsActive] = useState(true);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/admins", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) setNotice({ type: "error", text: json.error ?? "Could not load admin access." });
      else {
        setCandidates(json.data?.candidates ?? []);
        setAssignments(json.data?.assignments ?? []);
      }
    } catch {
      setNotice({ type: "error", text: "Could not load admin access." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    fetch("/api/admin/admins", { cache: "no-store" }).then(async (response) => {
      const json = await response.json();
      if (!mounted) return;
      if (!response.ok) setNotice({ type: "error", text: json.error ?? "Could not load admin access." });
      else {
        setCandidates(json.data?.candidates ?? []);
        setAssignments(json.data?.assignments ?? []);
      }
      setLoading(false);
    }).catch(() => {
      if (mounted) {
        setNotice({ type: "error", text: "Could not load admin access." });
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  const candidateById = useMemo(() => new Map(candidates.map((candidate) => [candidate.id, candidate])), [candidates]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return candidates.filter((candidate) => {
      const searchable = `${candidate.email ?? ""} ${candidate.display_name ?? ""} ${candidate.username ?? ""} ${candidate.binzeo_user_id ?? ""}`.toLowerCase();
      return !needle || searchable.includes(needle);
    });
  }, [candidates, query]);

  function chooseRoles(nextRoles: string[]) {
    const previousDefaults = new Set(defaultPermissionsForRoles(roles));
    const retainedCustomPermissions = permissions.filter((permission) => !previousDefaults.has(permission));
    setRoles(nextRoles);
    setPermissions([...new Set([...defaultPermissionsForRoles(nextRoles), ...retainedCustomPermissions])]);
  }

  function startEdit(assignment: Assignment) {
    setSelected(assignment.user_id);
    setRoles(assignment.roles ?? []);
    setPermissions(assignment.roles?.includes("super_admin")
      ? defaultPermissionsForRoles(["super_admin"])
      : (assignment.permissions ?? []).filter((permission) => ADMIN_PERMISSION_OPTIONS.some((option) => option.id === permission)));
    setIsActive(assignment.is_active);
    setNotice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setSelected("");
    setRoles(["support_admin"]);
    setPermissions(defaultPermissionsForRoles(["support_admin"]));
    setIsActive(true);
  }

  function toggleRole(id: string) {
    const next = roles.includes(id) ? roles.filter((role) => role !== id) : [...roles, id];
    chooseRoles(next);
  }

  function togglePermission(id: string) {
    setPermissions((current) => current.includes(id) ? current.filter((permission) => permission !== id) : [...current, id]);
  }

  async function save() {
    if (!selected || roles.length === 0) return;
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: selected, roles, permissions, is_active: isActive }),
      });
      const json = await response.json();
      if (!response.ok) setNotice({ type: "error", text: json.error ?? "Could not save admin access." });
      else {
        setNotice({ type: "success", text: json.data?.audit_recorded === false ? "Access saved, but the audit log could not be confirmed. Please review Admin audit." : "Admin roles and permissions saved." });
        resetForm();
        await load();
      }
    } catch {
      setNotice({ type: "error", text: "Could not save admin access." });
    } finally {
      setSaving(false);
    }
  }

  const selectedCandidate = candidateById.get(selected);
  const hasSuperAdmin = roles.includes("super_admin");

  return <div className="card admin-access-manager" style={{ marginTop: 18 }}>
    <div className="section-head" style={{ marginBottom: 18 }}>
      <div><p className="eyebrow">Privileged access control</p><h3 style={{ margin: "5px 0" }}>Administrator roles & permissions</h3><p className="muted">Search by email or BINZEO ID, then assign one or more roles and explicit permissions.</p></div>
      <span className="badge warn">Super Admin only</span>
    </div>
    {notice && <p className={notice.type === "error" ? "error" : "protected-note"} role="status">{notice.text}</p>}
    <div className="admin-access-layout">
      <section className="card" style={{ boxShadow: "none", background: "var(--surface-2, #f8fafc)" }}>
        <p className="eyebrow">{assignments.some((item) => item.user_id === selected) ? "Edit access" : "Assign access"}</p>
        <label className="form-grid" style={{ maxWidth: "none", gap: 7 }}><span className="muted" style={{ fontSize: 12, fontWeight: 700 }}>Find a user</span><input className="input" placeholder="Search email, name, username or BINZEO ID" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <label className="form-grid" style={{ maxWidth: "none", gap: 7, marginTop: 10 }}><span className="muted" style={{ fontSize: 12, fontWeight: 700 }}>User account</span><select className="input" value={selected} onChange={(event) => { const id = event.target.value; const existing = assignments.find((item) => item.user_id === id); if (existing) startEdit(existing); else { setSelected(id); setRoles(["support_admin"]); setPermissions(defaultPermissionsForRoles(["support_admin"])); setIsActive(true); } }} disabled={loading}><option value="">{loading ? "Loading users…" : "Choose an account"}</option>{filtered.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.email ?? "No email"} · {candidate.display_name || candidate.username || candidate.binzeo_user_id || candidate.id}</option>)}</select></label>
        {selectedCandidate && <p className="muted" style={{ margin: "8px 0 0", fontSize: 12 }}>Account status: {selectedCandidate.account_status ?? "unknown"} · ID: {selectedCandidate.binzeo_user_id ?? selectedCandidate.id}</p>}

        <p className="muted" style={{ margin: "18px 0 8px", fontWeight: 700 }}>Roles</p>
        <div className="admin-role-options">{ADMIN_ROLE_OPTIONS.map((role) => <label key={role.id} className="card" style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: 11, boxShadow: "none" }}><input type="checkbox" checked={roles.includes(role.id)} onChange={() => toggleRole(role.id)} /><span><strong>{role.label}</strong><br /><small className="muted">{role.description}</small></span></label>)}</div>

        <div className="section-head" style={{ margin: "18px 0 8px" }}><div><p className="muted" style={{ margin: 0, fontWeight: 700 }}>Permissions</p><small className="muted">{hasSuperAdmin ? "Super Admin receives every permission automatically." : "Role presets are included; adjust permissions as needed."}</small></div><span className="badge">{permissions.length} selected</span></div>
        <div className="admin-permission-options">{ADMIN_PERMISSION_OPTIONS.map((permission) => <label key={permission.id} className="muted" style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12 }}><input type="checkbox" checked={permissions.includes(permission.id)} onChange={() => togglePermission(permission.id)} disabled={hasSuperAdmin} /><span><strong>{permission.label}</strong><br />{permission.description}</span></label>)}</div>

        <label className="muted" style={{ display: "flex", gap: 9, alignItems: "center", marginTop: 16 }}><input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} /> Admin access is active</label>
        <div className="actions" style={{ marginTop: 14 }}><button className="btn" type="button" onClick={() => void save()} disabled={!selected || !roles.length || saving}>{saving ? "Saving…" : "Save role & permissions"}</button>{selected && <button className="btn light" type="button" onClick={resetForm} disabled={saving}>Clear</button>}</div>
        <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>Passwords, OTPs, session tokens and private authentication keys are never changed or shown by this role manager. At least one active Super Admin must remain.</p>
      </section>

      <section>
        <div className="section-head"><div><p className="eyebrow">Current assignments</p><h3 style={{ margin: "5px 0" }}>Admin directory</h3></div><span className="badge">{assignments.length} records</span></div>
        {loading ? <p className="muted">Loading admin roles…</p> : assignments.length === 0 ? <p className="muted">No administrator assignments found.</p> : <div style={{ display: "grid", gap: 9 }}>{assignments.map((assignment) => {
          const candidate = candidateById.get(assignment.user_id);
          return <article className="card" key={assignment.user_id} style={{ boxShadow: "none", padding: 13 }}>
            <div className="section-head" style={{ marginBottom: 8 }}><div><strong>{candidate?.email ?? candidate?.display_name ?? assignment.user_id}</strong><p className="muted" style={{ margin: "4px 0" }}>{candidate?.display_name ?? candidate?.username ?? candidate?.binzeo_user_id ?? assignment.user_id}</p></div><span className={`badge ${assignment.is_active ? "good" : "warn"}`}>{assignment.is_active ? "Active" : "Inactive"}</span></div>
            <p style={{ margin: "5px 0" }}><strong>Roles:</strong> {assignment.roles?.join(", ") || "—"}</p><p className="muted" style={{ margin: "5px 0", fontSize: 12 }}><strong>Permissions:</strong> {assignment.roles?.includes("super_admin") ? "All current permissions (automatic)" : assignment.permissions?.filter((permission) => ADMIN_PERMISSION_OPTIONS.some((option) => option.id === permission)).join(", ") || "none"}</p>
            <button className="btn light" type="button" onClick={() => startEdit(assignment)}>Edit access</button>
          </article>;
        })}</div>}
        <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>User lookup currently returns the most recent 1,000 profiles.</p>
      </section>
    </div>
  </div>;
}
