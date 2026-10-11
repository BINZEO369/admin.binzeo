/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WISH_PRESETS } from "@/lib/wish-presets";

type ImageItem = { url: string; position: string };
type ButtonItem = { label: string; url: string };
type ContentBlock =
  | { id: string; type: "headline"; text: string }
  | { id: string; type: "message"; text: string }
  | { id: string; type: "button"; label: string; url: string };
type Template = {
  id?: string;
  name: string;
  template_type: "birthday" | "marketing" | "occasion";
  theme: "dark" | "light";
  subject: string;
  preview_text: string;
  headline: string;
  message: string;
  button_label: string;
  button_url: string;
  buttons: ButtonItem[];
  images: ImageItem[];
  content_blocks: ContentBlock[];
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
  content_blocks: [],
};
const positions = ["top", "after_headline", "after_message", "before_button"];
const MAX_CONTENT_BLOCKS = 32;
const MAX_CONTENT_BUTTONS = 8;

function newBlockId() {
  return globalThis.crypto?.randomUUID?.() ?? `block-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function createBlock(type: ContentBlock["type"]): ContentBlock {
  const id = newBlockId();
  if (type === "headline") return { id, type, text: "" };
  if (type === "message") return { id, type, text: "" };
  return { id, type, label: "", url: "" };
}

function legacyContentBlocks(template: Template): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const headline = template.headline?.trim() ?? "";
  const message = template.message?.trim() ?? "";
  if (headline) blocks.push({ id: newBlockId(), type: "headline", text: headline });
  if (message) blocks.push({ id: newBlockId(), type: "message", text: message });
  const oldButtons = template.buttons?.length
    ? template.buttons
    : template.button_label || template.button_url ? [{ label: template.button_label, url: template.button_url }] : [];
  oldButtons.forEach((button) => {
    if (button.label || button.url) blocks.push({ id: newBlockId(), type: "button", label: button.label, url: button.url });
  });
  if (!blocks.some((block) => block.type === "headline")) blocks.unshift(createBlock("headline"));
  if (!blocks.some((block) => block.type === "message")) {
    const firstHeadline = blocks.findIndex((block) => block.type === "headline");
    blocks.splice(firstHeadline + 1, 0, createBlock("message"));
  }
  return blocks;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [form, setForm] = useState<Template>(blank);
  const [status, setStatus] = useState("Loading saved templates…");
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [selectedWishTitle, setSelectedWishTitle] = useState("");

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
    setPreviewHtml("");
    setForm((current) => ({ ...current, [key]: value }));
  }

  function edit(template: Template) {
    setSelectedWishTitle("");
    setPreviewHtml("");
    const contentBlocks = template.content_blocks?.length
      ? template.content_blocks
      : template.template_type === "occasion" ? legacyContentBlocks(template) : [];
    setForm({ ...blank, ...template, content_blocks: contentBlocks, buttons: template.buttons ?? [], images: template.images ?? [] });
    setStatus(`Editing ${template.name}.`);
  }

  function startFromWish(title: string) {
    const hasExistingWork = Boolean(
      form.id || form.message.trim() || form.preview_text.trim() || form.button_label.trim() || form.button_url.trim() ||
      form.buttons.length || form.images.length ||
      (!selectedWishTitle && (form.name.trim() || form.subject.trim() || form.headline.trim())) ||
      (selectedWishTitle && [form.name, form.subject, form.headline].some((value) => value.trim() && value !== selectedWishTitle))
    );
    if (hasExistingWork && !window.confirm("Replace the current template draft with a new wish title? Unsaved edits will be lost.")) return;
    setSelectedWishTitle(title);
    setPreviewHtml("");
    setForm({
      ...blank,
      name: title,
      template_type: "occasion",
      subject: title,
      headline: title,
      content_blocks: [
        { id: newBlockId(), type: "headline", text: title },
        { id: newBlockId(), type: "message", text: "" },
      ],
    });
    setStatus(`Draft started from “${title}”. Add headlines, messages or buttons in the order you want, then preview and save.`);
  }

  function changeTemplateType(templateType: Template["template_type"]) {
    setPreviewHtml("");
    setForm((current) => {
      if (templateType === "occasion" && !current.content_blocks.length) {
        return { ...current, template_type: templateType, content_blocks: legacyContentBlocks(current) };
      }
      return { ...current, template_type: templateType };
    });
  }

  function addContentBlock(type: ContentBlock["type"]) {
    setPreviewHtml("");
    setForm((current) => ({ ...current, content_blocks: [...current.content_blocks, createBlock(type)] }));
  }

  function updateContentBlock(index: number, key: "text" | "label" | "url", value: string) {
    setPreviewHtml("");
    setForm((current) => {
      const contentBlocks = [...current.content_blocks];
      const block = contentBlocks[index];
      if (!block) return current;
      if (key === "text" && block.type !== "button") contentBlocks[index] = { ...block, text: value };
      if (key === "label" && block.type === "button") contentBlocks[index] = { ...block, label: value };
      if (key === "url" && block.type === "button") contentBlocks[index] = { ...block, url: value };
      return { ...current, content_blocks: contentBlocks };
    });
  }

  function moveContentBlock(index: number, direction: -1 | 1) {
    setPreviewHtml("");
    setForm((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.content_blocks.length) return current;
      const contentBlocks = [...current.content_blocks];
      [contentBlocks[index], contentBlocks[target]] = [contentBlocks[target], contentBlocks[index]];
      return { ...current, content_blocks: contentBlocks };
    });
  }

  function removeContentBlock(index: number) {
    setPreviewHtml("");
    setForm((current) => ({ ...current, content_blocks: current.content_blocks.filter((_, blockIndex) => blockIndex !== index) }));
  }

  async function preview() {
    setPreviewing(true);
    setPreviewHtml("");
    try {
      const response = await fetch("/api/admin/email-templates/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await response.json();
      const data = json.data ?? json;
      if (!response.ok) {
        setStatus(json.error?.message ?? "Preview could not be generated.");
        return;
      }
      setPreviewHtml(typeof data.html === "string" ? data.html : "");
      setStatus("Preview reflects the current unsaved fields. Nothing has been saved or sent.");
    } catch {
      setStatus("Could not reach the preview service. The template was not saved or sent.");
    } finally {
      setPreviewing(false);
    }
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
      setForm({ ...blank, ...data.template, buttons: data.template.buttons ?? [], images: data.template.images ?? [], content_blocks: data.template.content_blocks ?? [] });
      setStatus("Template saved in the central email template library.");
      await load();
    } catch {
      setStatus("Could not reach the template service. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const headlineCount = form.content_blocks.filter((block) => block.type === "headline").length;
  const messageCount = form.content_blocks.filter((block) => block.type === "message").length;
  const blockButtonCount = form.content_blocks.filter((block) => block.type === "button").length;
  const canAddBlock = form.content_blocks.length < MAX_CONTENT_BLOCKS;

  return (
    <div className="content">
      <div className="section-head">
        <div>
          <p className="eyebrow">Communications / central library</p>
          <h2>Email templates</h2>
          <p className="muted">Create and save birthday, marketing and occasion templates here. Occasion content blocks can be arranged and previewed before saving.</p>
        </div>
        <Link className="btn light" href="/dashboard/marketing">Go to send emails</Link>
      </div>

      <section className="card" style={{ marginBottom: 18 }}>
        <p className="eyebrow">Start from a wish or occasion</p>
        <p className="muted">All {WISH_PRESETS.length} provided titles are listed below. Select any title once to start its Occasion draft; then add content, preview and save. Nothing is sent automatically.</p>
        <ol className="wish-presets-grid" aria-label="110 wish and occasion titles">
          {WISH_PRESETS.map((title, index) => (
            <li key={title}>
              <button
                className="wish-preset-button"
                type="button"
                aria-pressed={selectedWishTitle === title}
                onClick={() => startFromWish(title)}
              >
                <span className="wish-preset-number">{String(index + 1).padStart(2, "0")}</span>
                <span>{title}</span>
              </button>
            </li>
          ))}
        </ol>
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
          <button className="btn light" type="button" onClick={() => { setSelectedWishTitle(""); setPreviewHtml(""); setForm({ ...blank, content_blocks: [] }); setStatus("Creating a new template."); }}>
            + New template
          </button>
        </section>

        <section className="card">
          <p className="eyebrow">Template editor</p>
          <div className="two-col">
            <label className="field-label">Name<input className="input" value={form.name} onChange={(event) => update("name", event.target.value)} /></label>
            <label className="field-label">Type
              <select className="input" value={form.template_type} onChange={(event) => changeTemplateType(event.target.value as Template["template_type"])}>
                <option value="marketing">Marketing email</option>
                <option value="occasion">Festival / occasion email</option>
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

          {form.template_type === "occasion" ? (
            <section className="content-block-editor">
              <p className="eyebrow">Email content · {form.content_blocks.length}/{MAX_CONTENT_BLOCKS} blocks</p>
              <p className="muted">Add multiple headlines and messages. Add each button as its own block, then use Up/Down to place it anywhere in the email. The list order is the email order.</p>
              <div className="content-block-tools">
                <button className="btn light" type="button" disabled={!canAddBlock} onClick={() => addContentBlock("headline")}>+ Add headline</button>
                <button className="btn light" type="button" disabled={!canAddBlock} onClick={() => addContentBlock("message")}>+ Add message</button>
                <button className="btn light" type="button" disabled={!canAddBlock || blockButtonCount >= MAX_CONTENT_BUTTONS} onClick={() => addContentBlock("button")}>+ Add button · {blockButtonCount}/{MAX_CONTENT_BUTTONS}</button>
              </div>
              <div className="content-block-list">
                {form.content_blocks.map((block, index) => {
                  const ordinal = form.content_blocks.slice(0, index + 1).filter((item) => item.type === block.type).length;
                  const label = block.type === "headline" ? `Headline ${ordinal}` : block.type === "message" ? `Message ${ordinal}` : `Button ${ordinal}`;
                  return (
                    <section className="content-block-card" key={block.id}>
                      <div className="content-block-head">
                        <strong>{label}</strong>
                        <div className="actions">
                          <button className="btn light" type="button" aria-label={`Move ${label} up`} disabled={index === 0} onClick={() => moveContentBlock(index, -1)}>Up</button>
                          <button className="btn light" type="button" aria-label={`Move ${label} down`} disabled={index === form.content_blocks.length - 1} onClick={() => moveContentBlock(index, 1)}>Down</button>
                          <button className="btn light" type="button" onClick={() => removeContentBlock(index)}>Remove</button>
                        </div>
                      </div>
                      {block.type === "headline" && (
                        <label className="field-label">Headline text
                          <input className="input" maxLength={180} value={block.text} onChange={(event) => updateContentBlock(index, "text", event.target.value)} placeholder="Add a headline" />
                        </label>
                      )}
                      {block.type === "message" && (
                        <label className="field-label">Message text
                          <textarea className="input" rows={5} maxLength={10000} value={block.text} onChange={(event) => updateContentBlock(index, "text", event.target.value)} placeholder="Write the email message" />
                          <span className="muted">Use <code>{"{{name}}"}</code> for personalization.</span>
                        </label>
                      )}
                      {block.type === "button" && (
                        <div className="content-block-button-fields">
                          <label className="field-label">Button label<input className="input" maxLength={80} value={block.label} onChange={(event) => updateContentBlock(index, "label", event.target.value)} placeholder="Button label" /></label>
                          <label className="field-label">Button URL<input className="input" value={block.url} onChange={(event) => updateContentBlock(index, "url", event.target.value)} placeholder="https://…" /></label>
                        </div>
                      )}
                    </section>
                  );
                })}
                {!form.content_blocks.length && <p className="muted">Add at least one headline and one message block. Buttons are optional.</p>}
              </div>
              <p className="muted">Current blocks: {headlineCount} headline(s), {messageCount} message(s), {blockButtonCount} button(s).</p>
            </section>
          ) : (
            <>
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
            </>
          )}

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

          <section className="template-preview-panel">
            <div className="template-preview-head">
              <div>
                <p className="eyebrow">Unsaved email preview</p>
                <p className="muted">Preview uses the current editor fields. It does not save or send email.</p>
              </div>
              <button className="btn light" type="button" disabled={previewing || saving} onClick={() => void preview()}>{previewing ? "Building preview…" : "Preview before saving"}</button>
            </div>
            {previewHtml && (
              <>
                <p className="template-preview-subject"><strong>Subject:</strong> {form.subject || "(no subject yet)"}</p>
                <iframe className="email-preview-render" title="Unsaved email template preview" sandbox="" referrerPolicy="no-referrer" srcDoc={previewHtml} />
              </>
            )}
          </section>
          <div className="actions">
            <button className="btn" type="button" disabled={saving || previewing} onClick={() => void save()}>{saving ? "Saving…" : "Save template"}</button>
          </div>
          {status && <p className="muted" role="status">{status}</p>}
        </section>
      </div>
    </div>
  );
}
