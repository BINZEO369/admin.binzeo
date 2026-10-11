/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WISH_PRESETS } from "@/lib/wish-presets";

type ImageItem = { url: string; position: string };
type ButtonItem = { label: string; url: string };
type Template = {
  id?: string;
  name: string;
  template_type: "birthday" | "marketing";
  theme: "dark" | "light";
  subject: string;
  preview_text: string;
  headline: string;
  message: string;
  button_label: string;
  button_url: string;
  buttons: ButtonItem[];
  images: ImageItem[];
  updated_at?: string;
};

const blank: Template = {
  name: "",
  template_type: "marketing",
  theme: "dark",
  subject: "",
  preview_text: "",
  headline: "",
  message: "",
  button_label: "",
  button_url: "",
  buttons: [],
  images: [],
};
const positions = ["top", "after_headline", "after_message", "before_button"];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [form, setForm] = useState<Template>(blank);
  const [status, setStatus] = useState("Loading saved templates…");
  const [saving, setSaving] = useState(false);
  const [presetTitle, setPresetTitle] = useState("");

  async function load() {
    const response = await fetch("/api/admin/email-templates", { cache: "no-store" });
    const json = await response.json();
    const data = json.data ?? json;
    if (!response.ok) {
      setStatus(json.error?.message ?? "Templates could not be loaded.");
      return;
    }
    setTemplates(data.templates ?? []);
    setStatus((data.templates ?? []).length ? "Saved templates loaded." : "No saved templates yet.");
  }

  useEffect(() => {
    void load();
  }, []);

  function update<K extends keyof Template>(key: K, value: Template[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function edit(template: Template) {
    setForm({ ...blank, ...template, buttons: template.buttons ?? [], images: template.images ?? [] });
    setStatus(`Editing ${template.name}.`);
  }

  function startFromWish() {
    const title = WISH_PRESETS.find((item) => item.toLocaleLowerCase() === presetTitle.trim().toLocaleLowerCase());
    if (!title) return;
    setForm({ ...blank, name: title, subject: title, headline: title });
    setPresetTitle("");
    setStatus(`Draft started from “${title}”. Write the email message, then save it to the central library.`);
  }

  async function save() {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/email-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await response.json();
      const data = json.data ?? json;
      if (!response.ok) {
        setStatus(json.error?.message ?? "Template could not be saved.");
        return;
      }
      setForm({ ...blank, ...data.template, buttons: data.template.buttons ?? [], images: data.template.images ?? [] });
      setStatus("Template saved in the central email template library.");
      await load();
    } catch {
      setStatus("Could not reach the template service. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="content">
      <div className="section-head">
        <div>
          <p className="eyebrow">Communications / central library</p>
          <h2>Email templates</h2>
          <p className="muted">Create and save birthday, marketing and future email templates here. Sending pages only select a saved template.</p>
        </div>
        <Link className="btn light" href="/dashboard/marketing">Go to send emails</Link>
      </div>

      <section className="card" style={{ marginBottom: 18 }}>
        <p className="eyebrow">Start from a wish or occasion</p>
        <div className="two-col">
          <label className="field-label">
            Search the {WISH_PRESETS.length} provided wish titles
            <input
              className="input"
              list="binzeo-wish-presets"
              value={presetTitle}
              onChange={(event) => setPresetTitle(event.target.value)}
              placeholder="Type to find a wish or occasion"
            />
            <datalist id="binzeo-wish-presets">
              {WISH_PRESETS.map((title) => <option key={title} value={title} />)}
            </datalist>
          </label>
          <div className="actions" style={{ alignItems: "end" }}>
            <button
              className="btn"
              type="button"
              disabled={!WISH_PRESETS.some((item) => item.toLocaleLowerCase() === presetTitle.trim().toLocaleLowerCase())}
              onClick={startFromWish}
            >
              Create draft from title
            </button>
          </div>
        </div>
        <p className="muted">A selected title fills the template name, subject and headline. The wish list contains titles only, so write the email body before saving. Nothing is sent automatically.</p>
      </section>

      <div className="marketing-grid">
        <section className="card">
          <p className="eyebrow">Saved templates</p>
          <div className="recipient-picker">
            {templates.map((template) => (
              <button
                className="team-option"
                style={{ textAlign: "left", width: "100%" }}
                type="button"
                key={template.id}
                onClick={() => edit(template)}
              >
                <strong>{template.name}</strong><br />
                <span className="muted">{template.template_type} · {template.theme} · {template.updated_at ? new Date(template.updated_at).toLocaleString() : ""}</span>
              </button>
            ))}
            {!templates.length && <span className="muted">No templates saved yet.</span>}
          </div>
          <button className="btn light" type="button" onClick={() => { setForm({ ...blank }); setStatus("Creating a new template."); }}>
            + New template
          </button>
        </section>

        <section className="card">
          <p className="eyebrow">Template editor</p>
          <div className="two-col">
            <label className="field-label">Name<input className="input" value={form.name} onChange={(event) => update("name", event.target.value)} /></label>
            <label className="field-label">Type
              <select className="input" value={form.template_type} onChange={(event) => update("template_type", event.target.value as Template["template_type"])}>
                <option value="marketing">Marketing email</option>
                <option value="birthday">Birthday email</option>
              </select>
            </label>
          </div>
          <label className="field-label">Theme
            <select className="input" value={form.theme} onChange={(event) => update("theme", event.target.value as Template["theme"])}>
              <option value="dark">Dark · black background / white text</option>
              <option value="light">Light · white background / black text</option>
            </select>
          </label>
          <label className="field-label">Subject<input className="input" value={form.subject} onChange={(event) => update("subject", event.target.value)} /></label>
          <label className="field-label">Preheader<input className="input" value={form.preview_text} onChange={(event) => update("preview_text", event.target.value)} /></label>
          <label className="field-label">Headline<input className="input" value={form.headline} onChange={(event) => update("headline", event.target.value)} /></label>
          <label className="field-label">Message
            <textarea className="input" rows={8} value={form.message} onChange={(event) => update("message", event.target.value)} />
            <span className="muted">Use <code>{"{{name}}"}</code> for personalization.</span>
          </label>
          <p className="eyebrow">Buttons · {form.buttons.length}/8</p>
          {form.buttons.map((button, index) => (
            <div className="image-slot" key={index}>
              <input className="input" placeholder="Button label" value={button.label} onChange={(event) => { const items = [...form.buttons]; items[index] = { ...items[index], label: event.target.value }; update("buttons", items); }} />
              <input className="input" placeholder="https://…" value={button.url} onChange={(event) => { const items = [...form.buttons]; items[index] = { ...items[index], url: event.target.value }; update("buttons", items); }} />
              <button className="btn light" type="button" onClick={() => update("buttons", form.buttons.filter((_, itemIndex) => itemIndex !== index))}>Remove button</button>
            </div>
          ))}
          <button className="btn light" type="button" disabled={form.buttons.length >= 8} onClick={() => update("buttons", [...form.buttons, { label: "", url: "" }])}>+ Add button</button>
          <p className="eyebrow">Images · {form.images.length}/8</p>
          {form.images.map((image, index) => (
            <div className="image-slot" key={index}>
              <input className="input" placeholder="https://…" value={image.url} onChange={(event) => { const items = [...form.images]; items[index] = { ...items[index], url: event.target.value }; update("images", items); }} />
              <select className="input" value={image.position} onChange={(event) => { const items = [...form.images]; items[index] = { ...items[index], position: event.target.value }; update("images", items); }}>
                {positions.map((position) => <option key={position} value={position}>{position}</option>)}
              </select>
              <button className="btn light" type="button" onClick={() => update("images", form.images.filter((_, itemIndex) => itemIndex !== index))}>Remove image</button>
            </div>
          ))}
          <button className="btn light" type="button" disabled={form.images.length >= 8} onClick={() => update("images", [...form.images, { url: "", position: "after_message" }])}>+ Add image</button>
          <div className="actions">
            <button className="btn" type="button" disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : "Save template"}</button>
          </div>
          {status && <p className="muted" role="status">{status}</p>}
        </section>
      </div>
    </div>
  );
}
