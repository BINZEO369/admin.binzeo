"use client";

import { useState, type FormEvent } from "react";

type Props = { initialDisplayName: string; initialUsername: string };

export default function AdminProfileEditor({ initialDisplayName, initialUsername }: Props) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [username, setUsername] = useState(initialUsername);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName, username }),
      });
      const result = await response.json();
      if (!response.ok) {
        setNotice({ type: "error", text: result.error ?? "Could not update your profile." });
      } else {
        setDisplayName(result.data?.profile?.display_name ?? displayName.trim());
        setUsername(result.data?.profile?.username ?? "");
        setNotice({ type: "success", text: "Your admin profile was updated." });
      }
    } catch {
      setNotice({ type: "error", text: "Could not update your profile. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  return <form className="admin-profile-form" onSubmit={save}>
    <label className="field-label">Display name
      <input className="input" name="display_name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={80} required />
    </label>
    <label className="field-label">Username
      <input className="input" name="username" value={username} onChange={(event) => setUsername(event.target.value)} maxLength={30} autoComplete="username" placeholder="3–30 letters, numbers, dots, underscores or hyphens" />
    </label>
    <div className="actions admin-profile-actions"><button className="btn" type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button><span className="muted admin-profile-hint">Email/password changes use the verified account flow.</span></div>
    {notice && <p className={notice.type === "error" ? "error" : "admin-success-note"} role="status">{notice.text}</p>}
  </form>;
}
