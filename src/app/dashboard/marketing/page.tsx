"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import EmailRecipientSelector, { type EmailRecipient } from "@/components/EmailRecipientSelector";

type User = EmailRecipient;
type Team = { id: string; sector_name: string };
type Template = { id: string; name: string; template_type: "birthday" | "marketing" | "occasion"; theme: string };
const BATCH_SIZE = 20;

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
    if (!window.confirm(`Send “${template.name}” to ${audience}? Only active users with marketing email consent will receive it.`)) return;

    setWorking(true);
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
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "The send request did not complete.";
      setStatus(`Stopped after ${sent} sent, ${failed} failed and ${skipped} skipped. ${message} Check the campaign delivery records before retrying.`);
    } finally {
      setWorking(false);
    }
  }

  return <div className="content">
    <div className="section-head"><div><p className="eyebrow">Communications / send only</p><h2>Marketing emails</h2><p className="muted">Choose a saved central template and filter eligible profiles. Email editing is available only in the Email templates section.</p></div><Link className="btn light" href="/dashboard/templates">Edit / save templates</Link></div>
    <div className="marketing-grid">
      <section className="card">
        <p className="eyebrow">Saved template</p>
        <select className="input" value={templateId} onChange={(event) => setTemplateId(event.target.value)} disabled={working}>
          <option value="">Select a saved template</option>
          {templates.map((template) => <option key={template.id} value={template.id}>{template.name} · {template.template_type} · {template.theme}</option>)}
        </select>
        <p className="muted">To create or edit birthday and marketing email designs, use <Link href="/dashboard/templates">Central Email Templates</Link>.</p>
        <p className="eyebrow">Teams / sectors</p>
        {teams.map((team) => <label className="team-option" key={team.id}><input type="checkbox" checked={teamIds.includes(team.id)} disabled={working || selectedUsers.length > 0} onChange={() => setTeamIds((current) => current.includes(team.id) ? current.filter((value) => value !== team.id) : [...current, team.id])} />{team.sector_name}</label>)}
        <div className="actions"><button className="btn" type="button" disabled={working || (!selectedUsers.length && !teamIds.length) || !templateId} onClick={() => void send()}>{working ? "Sending…" : selectedUsers.length ? `Send to ${selectedUsers.length} selected` : "Send to selected teams"}</button></div>
        <p className="muted">Large individual selections run in safe batches of 20. Each batch is separately recorded in campaign history.</p>
      </section>
      <section className="card">
        <div className="section-head"><div><p className="eyebrow">Eligible user profiles only</p><h3>Select recipients</h3></div></div>
        <p className="muted">Only active users who allowed Marketing emails are listed. Select all eligible users or combine filters for a targeted group.</p>
        {audienceTruncated && <p className="protected-note">The eligible audience reached the current 1,000-profile list limit. The selector contains only the first 1,000; narrow or paginate the audience before sending.</p>}
        <EmailRecipientSelector users={users} selectedIds={selectedUsers} onSelectedIdsChange={setSelectedUsers} disabled={working} />
      </section>
    </div>
    {status && <p className="protected-note" role="status">{status}</p>}
  </div>;
}
