"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import EmailRecipientSelector, { type EmailRecipient } from "@/components/EmailRecipientSelector";

type BirthdayUser = EmailRecipient & { binzeo_user_id: string; is_today: boolean; birthday_delivery: { birthday_year: number; status: string; sent_at: string | null; error_message: string | null } | null };
const BATCH_SIZE = 20;

export default function BirthdaysPage() {
  const [users, setUsers] = useState<BirthdayUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [today, setToday] = useState("");
  const [audienceTruncated, setAudienceTruncated] = useState(false);
  const [year, setYear] = useState(new Date().getUTCFullYear());
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Loading birthday profiles…");
  const [sending, setSending] = useState<string | null>(null);
  const [bulkSending, setBulkSending] = useState(false);

  async function load() {
    const response = await fetch("/api/admin/birthdays", { cache: "no-store" });
    const json = await response.json();
    if (!response.ok) { setStatus(json.error?.message ?? "Birthday data could not be loaded."); return; }
    const data = json.data ?? json;
    setUsers(data.users ?? []); setToday(data.today ?? ""); setAudienceTruncated(Boolean(data.audience_truncated)); setYear(data.year ?? year); setStatus("");
  }
  useEffect(() => {
    fetch("/api/admin/birthdays", { cache: "no-store" }).then(async (response) => {
      const json = await response.json();
      if (!response.ok) { setStatus(json.error?.message ?? "Birthday data could not be loaded."); return; }
      const data = json.data ?? json;
      setUsers(data.users ?? []); setToday(data.today ?? ""); setAudienceTruncated(Boolean(data.audience_truncated)); setYear(data.year ?? new Date().getUTCFullYear()); setStatus("");
    }).catch(() => setStatus("Birthday data could not be loaded."));
  }, []);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return users.filter((user) => !needle || `${user.display_name ?? ""} ${user.email ?? ""} ${user.binzeo_user_id}`.toLowerCase().includes(needle));
  }, [users, search]);
  const todayUsers = filtered.filter((user) => user.is_today);

  async function sendBirthday(user: BirthdayUser) {
    if (!user.email) { setStatus("This user has no email address."); return; }
    if (!window.confirm(`Send the ${year} birthday email to ${user.display_name || user.email}?`)) return;
    setSending(user.id); setStatus("");
    try {
      const response = await fetch("/api/admin/marketing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "send", template: "birthday", selected_user_ids: [user.id], subject: "Happy Birthday from BINZEO", preheader: "A special birthday wish from BINZEO.", headline: "Happy Birthday", message: "", button_label: "Open your BINZEO profile", button_url: "https://auth-binzeo.vercel.app/dashboard/profile", theme: "dark", team_ids: [], images: [] }) });
      const json = await response.json(); const data = json.data ?? json;
      setStatus(response.ok ? (data.sent ? `Birthday email sent to ${user.display_name || user.email}.` : `Not sent: ${data.skipped ? "already sent this year" : "delivery failed"}.`) : (json.error?.message ?? "Birthday email failed."));
      await load();
    } catch {
      setStatus("Birthday send did not complete. Check delivery history before retrying.");
    } finally {
      setSending(null);
    }
  }

  async function sendBirthdayBulk() {
    if (!selectedUsers.length) { setStatus("Select at least one eligible recipient."); return; }
    const selectedCount = selectedUsers.length;
    if (!window.confirm(`Send this year’s birthday wish to ${selectedCount} selected user(s)? Users already sent a birthday email this year will be skipped.`)) return;
    setBulkSending(true);
    let sent = 0; let failed = 0; let skipped = 0;
    const batches = Array.from({ length: Math.ceil(selectedUsers.length / BATCH_SIZE) }, (_, index) => selectedUsers.slice(index * BATCH_SIZE, (index + 1) * BATCH_SIZE));
    try {
      for (let index = 0; index < batches.length; index += 1) {
        const batch = batches[index];
        setStatus(`Sending birthday batch ${index + 1} of ${batches.length} (${sent} sent so far)…`);
        const response = await fetch("/api/admin/marketing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "send", template: "birthday", selected_user_ids: batch, subject: "Happy Birthday from BINZEO", preheader: "A special birthday wish from BINZEO.", headline: "Happy Birthday", message: "", button_label: "Open your BINZEO profile", button_url: "https://auth-binzeo.vercel.app/dashboard/profile", theme: "dark", team_ids: [], images: [] }) });
        const json = await response.json(); const data = json.data ?? json;
        if (!response.ok) throw new Error(json.error?.message ?? "Birthday batch failed.");
        sent += Number(data.sent ?? 0); failed += Number(data.failed ?? 0); skipped += Number(data.skipped ?? 0);
        setSelectedUsers((current) => current.filter((id) => !batch.includes(id)));
      }
      await load();
      setStatus(`Birthday emails complete: ${sent} sent, ${failed} failed, ${skipped} skipped for ${year}.`);
    } catch (error) {
      setStatus(`Stopped after ${sent} sent, ${failed} failed and ${skipped} skipped. ${error instanceof Error ? error.message : "The send request did not complete."} Check campaign delivery records before retrying.`);
    } finally {
      setBulkSending(false);
    }
  }

  return <div className="content">
    <div className="section-head"><div><p className="eyebrow">Directory / annual wishes</p><h2>User birthdays</h2><p className="muted">Every active user with marketing consent, their profile, birthday, current age and this year’s delivery status.</p></div><div className="actions"><Link className="btn light" href="/dashboard/templates">View saved template</Link><span className="badge good">{users.length} profiles</span></div></div>
    {status && <p className={status.startsWith("Loading") ? "muted" : "protected-note"} role="status">{status}</p>}
    <section className="card birthday-audience-card">
      <div className="section-head"><div><p className="eyebrow">Bulk birthday sender</p><h3>Filter and select recipients</h3></div><button className="btn" type="button" disabled={bulkSending || !selectedUsers.length} onClick={() => void sendBirthdayBulk()}>{bulkSending ? "Sending…" : `Send to ${selectedUsers.length} selected`}</button></div>
      <p className="muted">Filter by age, country, language or account-creation date. One click sends the selected recipients in batches of 20; annual duplicate protection remains active.</p>
      {audienceTruncated && <p className="protected-note">The eligible audience reached the current 1,000-profile list limit; only the first 1,000 birthday profiles are shown.</p>}
      <EmailRecipientSelector users={users} selectedIds={selectedUsers} onSelectedIdsChange={setSelectedUsers} disabled={bulkSending || Boolean(sending)} />
    </section>
    <section className="birthday-summary"><div className="card"><p className="eyebrow">Today · UTC</p><strong className="birthday-stat">{users.filter((user) => user.is_today).length}</strong><p className="muted">birthday today</p></div><div className="card"><p className="eyebrow">Year</p><strong className="birthday-stat">{year}</strong><p className="muted">one-send annual guard</p></div><div className="card"><p className="eyebrow">Date</p><strong className="birthday-date">{today || "—"}</strong><p className="muted">daily automation date</p></div></section>
    {todayUsers.length > 0 && <section className="card birthday-today"><div className="section-head"><div><p className="eyebrow">Today’s birthdays</p><h3>Send birthday wishes</h3></div><span className="badge good">{todayUsers.length} today</span></div><div className="birthday-grid">{todayUsers.map((user) => <BirthdayCard key={user.id} user={user} year={year} sending={bulkSending || sending === user.id} onSend={() => void sendBirthday(user)} />)}</div></section>}
    <section className="card"><div className="section-head"><div><p className="eyebrow">All birthday profiles</p><h3>Annual birthday directory</h3></div><input className="input birthday-search" placeholder="Search name, email or BINZEO ID" value={search} onChange={(event) => setSearch(event.target.value)} /></div><div className="birthday-grid">{filtered.map((user) => <BirthdayCard key={user.id} user={user} year={year} sending={bulkSending || sending === user.id} onSend={() => void sendBirthday(user)} />)}{!filtered.length && <p className="muted">No birthday profiles match your search.</p>}</div></section>
    <p className="protected-note" style={{ marginTop: 18 }}><strong>Saved template:</strong> <Link href="/dashboard/templates">open the central email template library</Link> to view or edit the birthday design. This section only sends wishes. If no custom version exists, the default BINZEO template is used. <strong>Duplicate protection:</strong> the database allows only one <code>birthday_email_deliveries</code> record per user per year. Automatic daily processing and this manual button use the same guard.</p>
  </div>;
}

function BirthdayCard({ user, year, sending, onSend }: { user: BirthdayUser; year: number; sending: boolean; onSend: () => void }) {
  const delivery = user.birthday_delivery;
  const initials = (user.display_name || user.first_name || user.email || "U").slice(0, 1).toUpperCase();
  return <article className={`birthday-card${user.is_today ? " birthday-card-today" : ""}`}><div className="birthday-card-head">{user.profile_photo_url ? <img className="birthday-avatar" src={user.profile_photo_url} alt="" /> : <span className="birthday-avatar birthday-avatar-fallback">{initials}</span>}<div className="birthday-card-identity"><strong>{user.display_name || "Unnamed user"}</strong><span>{user.email || "No email"}</span><small>{user.binzeo_user_id}</small></div>{user.is_today && <span className="badge good">Today</span>}</div><div className="birthday-card-meta"><span><b>Birthday</b>{user.birth_date || "Not set"}</span><span><b>Age</b>{user.age ?? "—"}</span><span><b>{year} delivery</b>{delivery?.status || "Not sent"}</span></div><button className="btn" type="button" disabled={!user.email || sending || delivery?.status === "sent"} onClick={onSend}>{sending ? "Sending…" : delivery?.status === "sent" ? "Sent this year" : "Send birthday email"}</button></article>;
}
