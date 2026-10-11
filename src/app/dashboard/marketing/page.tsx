"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type User = { id: string; email: string; display_name: string | null; date_of_birth: string | null };
type Team = { id: string; sector_name: string };
type Template = { id: string; name: string; template_type: "birthday" | "marketing" | "occasion"; theme: string };

export default function MarketingPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Loading users and saved templates…");
  const [working, setWorking] = useState(false);
  const visible = useMemo(() => {
    const needle = search.toLowerCase().trim();
    return users.filter((user) => !needle || `${user.display_name ?? ""} ${user.email}`.toLowerCase().includes(needle));
  }, [users, search]);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/marketing", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/admin/email-templates", { cache: "no-store" }).then((response) => response.json()),
    ]).then(([marketingJson, templatesJson]) => {
      const marketingData = marketingJson.data ?? marketingJson;
      const templateData = templatesJson.data ?? templatesJson;
      const existingMarketingAndBirthday = (templateData.templates ?? []).filter((template: Template) => template.template_type !== "occasion");
      setUsers(marketingData.users ?? []);
      setTeams(marketingData.teams ?? []);
      setTemplates(existingMarketingAndBirthday);
      setTemplateId(existingMarketingAndBirthday[0]?.id ?? "");
      setStatus("");
    }).catch(() => setStatus("Could not load users and saved templates."));
  }, []);

  function toggle(id: string) {
    setSelectedUsers((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  async function send() {
    if (!templateId) { setStatus("Select a saved template first."); return; }
    if (!selectedUsers.length && !teamIds.length) { setStatus("Select at least one user or team."); return; }
    if (!window.confirm("Send the selected saved template?")) return;
    setWorking(true);
    const template = templates.find((item) => item.id === templateId);
    try {
      const response = await fetch("/api/admin/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", template_id: templateId, template: template?.template_type ?? "custom", selected_user_ids: selectedUsers, team_ids: teamIds }),
      });
      const json = await response.json();
      const data = json.data ?? json;
      setStatus(response.ok ? `Email complete: ${data.sent} sent, ${data.failed} failed, ${data.skipped} skipped.` : (json.error?.message ?? "Send failed."));
    } catch {
      setStatus("The send request did not complete.");
    } finally {
      setWorking(false);
    }
  }

  return <div className="content">
    <div className="section-head"><div><p className="eyebrow">Communications / send only</p><h2>Marketing emails</h2><p className="muted">Select a saved central template and eligible user profiles. Email editing is available only in the Email templates section.</p></div><Link className="btn light" href="/dashboard/templates">Edit / save templates</Link></div>
    <div className="marketing-grid">
      <section className="card">
        <p className="eyebrow">Saved template</p>
        <select className="input" value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
          <option value="">Select a saved template</option>
          {templates.map((template) => <option key={template.id} value={template.id}>{template.name} · {template.template_type} · {template.theme}</option>)}
        </select>
        <p className="muted">To create or edit birthday and marketing email designs, use <Link href="/dashboard/templates">Central Email Templates</Link>.</p>
        <p className="eyebrow">Teams / sectors</p>
        {teams.map((team) => <label className="team-option" key={team.id}><input type="checkbox" checked={teamIds.includes(team.id)} disabled={selectedUsers.length > 0} onChange={() => setTeamIds((current) => current.includes(team.id) ? current.filter((value) => value !== team.id) : [...current, team.id])} />{team.sector_name}</label>)}
        <div className="actions"><button className="btn" type="button" disabled={working} onClick={() => void send()}>{working ? "Sending…" : "Send saved template"}</button></div>
      </section>
      <section className="card">
        <div className="section-head"><div><p className="eyebrow">Eligible user profiles only</p><h3>Select recipients</h3></div><input className="input birthday-search" placeholder="Search name or email" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <p className="muted">Only active users who allowed Marketing emails are listed. Selected profiles override team targeting.</p>
        <div className="recipient-picker">{visible.map((user) => <label className="team-option" key={user.id}><input type="checkbox" checked={selectedUsers.includes(user.id)} onChange={() => toggle(user.id)} /><span><strong>{user.display_name || "Unnamed user"}</strong><br /><span className="muted">{user.email}{user.date_of_birth ? ` · birthday ${user.date_of_birth}` : ""}</span></span></label>)}{!visible.length && <span className="muted">No eligible profiles found.</span>}</div>
        <p className="muted">Selected: {selectedUsers.length} profile(s)</p>
      </section>
    </div>
    {status && <p className="protected-note" role="status">{status}</p>}
  </div>;
}
