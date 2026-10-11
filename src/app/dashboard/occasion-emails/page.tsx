/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type OccasionTemplate = { id: string; name: string; subject: string; headline: string; message: string; theme: string };
type Recipient = { id: string; email: string; display_name: string | null };
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

function statusClass(status: string) {
  return status === "sent" ? "badge good" : status === "failed" ? "badge warn" : "badge";
}
function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "—";
}

export default function OccasionEmailsPage() {
  const [templates, setTemplates] = useState<OccasionTemplate[]>([]);
  const [users, setUsers] = useState<Recipient[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Loading occasion templates, eligible users and send history…");
  const [loading, setLoading] = useState(true);
  const [sendingUserId, setSendingUserId] = useState<string | null>(null);

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
      setDeliveries(data.deliveries ?? []);
      setTemplateId((current: string) => current && nextTemplates.some((template: OccasionTemplate) => template.id === current) ? current : nextTemplates[0]?.id ?? "");
      setStatus("");
    } catch {
      setStatus("Could not reach the occasion email service.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const visibleUsers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return users.filter((user) => !needle || `${user.display_name ?? ""} ${user.email}`.toLowerCase().includes(needle));
  }, [users, search]);
  const visibleDeliveries = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return deliveries.filter((delivery) => !needle || `${delivery.recipient_name ?? ""} ${delivery.recipient_email} ${delivery.template_name} ${delivery.subject}`.toLowerCase().includes(needle));
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

  async function sendToUser(user: Recipient) {
    const template = templates.find((item) => item.id === templateId);
    if (!template) { setStatus("Save an Occasion-type template first."); return; }
    const prior = lastDeliveryByPair.get(`${user.id}:${template.id}`);
    const action = prior?.status === "sent" ? "Resend" : "Send";
    const confirmed = window.confirm(`${action} “${template.name}” to ${user.display_name || user.email} (${user.email})? This sends one email to this user only.`);
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
        return;
      }
      await load();
      setStatus(`“${template.name}” sent to ${user.display_name || user.email}; the delivery is recorded below.`);
    } catch {
      await load();
      setStatus("The send request did not complete. Check the delivery history before retrying.");
    } finally {
      setSendingUserId(null);
    }
  }

  const selectedTemplate = templates.find((template) => template.id === templateId);

  return (
    <div className="content">
      <div className="section-head">
        <div>
          <p className="eyebrow">Communications / individual occasion wishes</p>
          <h2>Occasion email sender</h2>
          <p className="muted">Choose a saved Festival / occasion template, then send it to one user at a time. Birthday automation and Marketing campaigns remain separate.</p>
        </div>
        <Link className="btn light" href="/dashboard/templates">Manage email templates</Link>
      </div>

      <section className="card" style={{ marginBottom: 18 }}>
        <div className="two-col">
          <label className="field-label">Saved occasion template
            <select className="input" value={templateId} onChange={(event) => setTemplateId(event.target.value)} disabled={loading || !templates.length}>
              <option value="">Select an Occasion template</option>
              {templates.map((template) => <option key={template.id} value={template.id}>{template.name} · {template.theme}</option>)}
            </select>
          </label>
          <label className="field-label">Search users and delivery history
            <input className="input" placeholder="Name, email, or template" value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
        </div>
        {selectedTemplate && <p className="muted">Selected: <strong>{selectedTemplate.name}</strong> · Subject: {selectedTemplate.subject}</p>}
        <p className="muted">Only active users who enabled marketing email consent are listed. Each send is individually confirmed, sent to one recipient, and logged. To create an occasion template, start from one of the wish presets in the template editor and save its message.</p>
        {!templates.length && !loading && <p className="protected-note">No saved Occasion templates yet. <Link href="/dashboard/templates">Create one from the wish-title presets</Link>, complete its message, and save it first.</p>}
      </section>

      <section className="card" style={{ marginBottom: 18 }}>
        <div className="section-head">
          <div><p className="eyebrow">Eligible recipients</p><h3>User list · {visibleUsers.length}</h3></div>
          <span className="badge">{users.length} eligible users</span>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>User</th><th>Email</th><th>Last status for selected template</th><th>Last sent</th><th>Action</th></tr></thead>
            <tbody>
              {visibleUsers.map((user) => {
                const last = selectedTemplate ? lastDeliveryByPair.get(`${user.id}:${selectedTemplate.id}`) : undefined;
                return <tr key={user.id}>
                  <td>{user.display_name || "Unnamed user"}</td>
                  <td>{user.email}</td>
                  <td>{last ? <span className={statusClass(last.status)}>{last.status}</span> : "Not sent"}</td>
                  <td>{formatDate(last?.sent_at ?? last?.created_at ?? null)}</td>
                  <td><button className="btn" type="button" disabled={!selectedTemplate || sendingUserId !== null} onClick={() => void sendToUser(user)}>{sendingUserId === user.id ? "Sending…" : last?.status === "sent" ? "Send again" : "Send to this user"}</button></td>
                </tr>;
              })}
              {!visibleUsers.length && <tr><td colSpan={5}>{loading ? "Loading users…" : "No eligible users match your search."}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="section-head"><div><p className="eyebrow">Occasion email audit log</p><h3>Who received which email · {visibleDeliveries.length}</h3></div><button className="btn light" type="button" disabled={loading} onClick={() => void load()}>Refresh</button></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>User</th><th>Email</th><th>Template / occasion</th><th>Subject</th><th>Status</th><th>Sent / attempted</th><th>Details</th></tr></thead>
            <tbody>
              {visibleDeliveries.map((delivery) => <tr key={delivery.id}>
                <td>{delivery.recipient_name || "User"}</td>
                <td>{delivery.recipient_email}</td>
                <td>{delivery.template_name}</td>
                <td>{delivery.subject}</td>
                <td><span className={statusClass(delivery.status)}>{delivery.status}</span></td>
                <td>{formatDate(delivery.sent_at ?? delivery.created_at)}</td>
                <td title={delivery.error_message ?? ""}>{delivery.error_message || "—"}</td>
              </tr>)}
              {!visibleDeliveries.length && <tr><td colSpan={7}>{loading ? "Loading history…" : "No occasion emails have been recorded yet."}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      {status && <p className="protected-note" role="status">{status}</p>}
    </div>
  );
}
