"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AccountStatusActions({ userId, status }: { userId: string; status: string | null | undefined }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  async function update(nextStatus: "active" | "suspended") {
    setWorking(true); setMessage("");
    const response = await fetch(`/api/admin/users/${userId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus, reason }) });
    const json = await response.json();
    if (!response.ok) setMessage(json.error ?? "Could not update status");
    else { setMessage(nextStatus === "suspended" ? "Account suspended." : "Account reactivated."); router.refresh(); }
    setWorking(false);
  }
  async function permanentlyDelete() {
    if (reason.trim().length < 3) { setMessage("Enter a deletion reason first."); return; }
    if (window.prompt('This permanently deletes the account. Type DELETE to continue.') !== "DELETE") return;
    setWorking(true); setMessage("");
    const response = await fetch(`/api/admin/users/${userId}/status`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
    const json = await response.json();
    if (!response.ok) { setMessage(json.error ?? "Could not delete account"); setWorking(false); return; }
    router.push("/dashboard/deleted-emails");
  }
  return <div className="card status-actions"><div className="section-head" style={{ marginBottom: 14 }}><div><p className="eyebrow">Account controls</p><h3 style={{ margin: "5px 0" }}>Status management</h3><p className="muted">Current status: <strong>{status ?? "unknown"}</strong></p></div><span className="badge warn">Destructive actions protected</span></div><label className="form-grid" style={{ maxWidth: "none", gap: 7 }}><span className="muted" style={{ fontSize: 12, fontWeight: 700 }}>Reason / internal note</span><textarea className="input" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why is this account being changed?" /></label><div className="actions" style={{ marginTop: 12, flexWrap: "wrap" }}>{status === "suspended" ? <button className="btn" type="button" onClick={() => void update("active")} disabled={working}>{working ? "Working…" : "Reactivate account"}</button> : <button className="btn light" type="button" onClick={() => void update("suspended")} disabled={working}>{working ? "Working…" : "Suspend account"}</button>}<button className="btn" style={{ background: "#8f1d2c", borderColor: "#8f1d2c" }} type="button" onClick={() => void permanentlyDelete()} disabled={working}>{working ? "Working…" : "Permanently delete"}</button></div>{message && <p className="muted" role="status">{message}</p>}</div>;
}
