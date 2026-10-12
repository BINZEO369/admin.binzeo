/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WISH_PRESETS } from "@/lib/wish-presets";

type ImageItem = { url: string; position: string };
type ButtonItem = { label: string; url: string };
type Alignment = "left" | "center" | "right";
type ContentBlock =
  | { id: string; type: "headline"; text: string; align?: Alignment }
  | { id: string; type: "message"; text: string; align?: Alignment }
  | { id: string; type: "button"; label: string; url: string; align?: Alignment; width?: "auto" | "full" }
  | {
      id: string;
      type: "image";
      url: string;
      size?: "small" | "medium" | "large" | "banner";
      align?: Alignment;
      layout?: "full" | "side-left" | "side-right";
      overlay_enabled?: boolean;
      overlay_title?: string;
      overlay_subtitle?: string;
      overlay_align?: Alignment;
      overlay_position?: "top" | "middle" | "bottom";
      overlay_button_label?: string;
      overlay_button_url?: string;
    };
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
const legacyImagePositions = ["top", "after_headline", "after_message", "before_button"];
const MAX_CONTENT_BLOCKS = 32;
const MAX_CONTENT_IMAGES = 8;
const MAX_CONTENT_BUTTONS = 8;

function newBlockId() {
  return globalThis.crypto?.randomUUID?.() ?? `block-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function createBlock(type: ContentBlock["type"]): ContentBlock {
  const id = newBlockId();
  if (type === "headline") return { id, type, text: "", align: "left" };
  if (type === "message") return { id, type, text: "", align: "left" };
  if (type === "button") return { id, type, label: "", url: "", align: "left", width: "auto" };
  return {
    id,
    type: "image",
    url: "",
    size: "medium",
    align: "center",
    layout: "full",
    overlay_enabled: false,
    overlay_title: "",
    overlay_subtitle: "",
    overlay_align: "center",
    overlay_position: "middle",
    overlay_button_label: "",
    overlay_button_url: "",
  };
}

function legacyContentBlocks(template: Template): ContentBlock[] {
  const blocks: ContentBlock[] = template.content_blocks?.length ? [...template.content_blocks] : [];
  if (!blocks.length) {
    const headline = template.headline?.trim() ?? "";
    const message = template.message?.trim() ?? "";
    if (headline) blocks.push({ id: newBlockId(), type: "headline", text: headline, align: "left" });
    if (message) blocks.push({ id: newBlockId(), type: "message", text: message, align: "left" });
    const oldButtons = template.buttons?.length
      ? template.buttons
      : template.button_label || template.button_url ? [{ label: template.button_label, url: template.button_url }] : [];
    oldButtons.forEach((button) => {
      if (button.label || button.url) blocks.push({ id: newBlockId(), type: "button", label: button.label, url: button.url, align: "left", width: "auto" });
    });
  }

  const existingImageUrls = new Set(blocks.flatMap((block) => block.type === "image" ? [block.url] : []));
  const legacyImages = (template.images ?? []).filter((image) => !existingImageUrls.has(image.url));
  if (legacyImages.length) {
    for (const [reverseIndex, image] of [...legacyImages].reverse().entries()) {
      const imageBlock: ContentBlock = {
        id: `legacy-image-${legacyImages.length - reverseIndex}`,
        type: "image",
        url: image.url,
        size: "banner",
        align: "center",
        layout: "full",
        overlay_enabled: false,
        overlay_title: "",
        overlay_subtitle: "",
        overlay_align: "center",
        overlay_position: "middle",
        overlay_button_label: "",
        overlay_button_url: "",
      };
      let position = blocks.length;
      if (image.position === "top") position = 0;
      if (image.position === "after_headline") {
        const headline = blocks.findIndex((block) => block.type === "headline");
        position = headline < 0 ? 0 : headline + 1;
      }
      if (image.position === "after_message") {
        const message = blocks.findIndex((block) => block.type === "message");
        position = message < 0 ? blocks.length : message + 1;
      }
      if (image.position === "before_button") {
        const button = blocks.findIndex((block) => block.type === "button");
        position = button < 0 ? blocks.length : button;
      }
      blocks.splice(position, 0, imageBlock);
    }
  }

  if (!blocks.some((block) => block.type === "headline")) {
    const firstNonTopImage = blocks.findIndex((block) => block.type === "image");
    const initialTopImages = blocks.filter((block) => block.type === "image").length === legacyImages.filter((image) => image.position === "top").length
      ? blocks.length
      : Math.max(0, firstNonTopImage);
    blocks.splice(initialTopImages, 0, createBlock("headline"));
  }
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [selectedWishTitle, setSelectedWishTitle] = useState("");

  async function load(announce = true): Promise<boolean> {
    try {
      const response = await fetch("/api/admin/email-templates", { cache: "no-store" });
      const json = await response.json();
      const data = json.data ?? json;
      if (!response.ok) {
        setStatus(json.error?.message ?? "Templates could not be loaded.");
        return false;
      }
      setTemplates(data.templates ?? []);
      if (announce) setStatus((data.templates ?? []).length ? "Saved templates loaded." : "No templates saved yet.");
      return true;
    } catch {
      setStatus("Could not reach the saved template list.");
      return false;
    }
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
    const contentBlocks = template.template_type === "occasion" ? legacyContentBlocks(template) : [];
    setForm({
      ...blank,
      ...template,
      content_blocks: contentBlocks,
      buttons: template.buttons ?? [],
      images: template.template_type === "occasion" ? [] : template.images ?? [],
    });
    setStatus(`Editing ${template.name}.`);
  }

  function startFromWish(title: string) {
    const hasExistingWork = Boolean(
      form.id || form.message.trim() || form.preview_text.trim() || form.button_label.trim() || form.button_url.trim() ||
      form.buttons.length || form.images.length || form.content_blocks.some((block) => block.type === "image" || block.type === "button") ||
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
        { id: newBlockId(), type: "headline", text: title, align: "left" },
        { id: newBlockId(), type: "message", text: "", align: "left" },
      ],
    });
    setStatus(`Draft started from “${title}”. Add and arrange headlines, messages, images and buttons; preview before saving.`);
  }

  function changeTemplateType(templateType: Template["template_type"]) {
    if (templateType === form.template_type) return;
    if (form.template_type === "occasion" && templateType !== "occasion" && form.content_blocks.length) {
      const confirmed = window.confirm("Switching away from Occasion uses the legacy editor. Advanced image layouts and block ordering will not apply to Birthday/Marketing templates. Continue?");
      if (!confirmed) return;
    }
    setPreviewHtml("");
    setForm((current) => {
      if (templateType === "occasion") {
        return { ...current, template_type: templateType, content_blocks: legacyContentBlocks(current), images: [] };
      }
      return { ...current, template_type: templateType };
    });
  }

  function addContentBlock(type: ContentBlock["type"]) {
    setPreviewHtml("");
    setForm((current) => ({ ...current, content_blocks: [...current.content_blocks, createBlock(type)] }));
  }

  function updateContentBlock(index: number, changes: Record<string, string | boolean>) {
    setPreviewHtml("");
    setForm((current) => {
      const contentBlocks = [...current.content_blocks];
      const block = contentBlocks[index];
      if (!block) return current;
      contentBlocks[index] = { ...block, ...changes } as ContentBlock;
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
      const savedTemplate = data.template as Template | undefined;
      if (!savedTemplate?.id || !savedTemplate.updated_at) {
        setStatus("The save service did not confirm the database write. Reload the template list before retrying.");
        return;
      }
      setForm({ ...blank, ...savedTemplate, buttons: savedTemplate.buttons ?? [], images: savedTemplate.images ?? [], content_blocks: savedTemplate.content_blocks ?? [] });
      const refreshed = await load(false);
      setStatus(refreshed
        ? `Saved in the database: ${savedTemplate.name} · ${new Date(savedTemplate.updated_at).toLocaleString()}`
        : `Saved in the database: ${savedTemplate.name}. The saved list could not refresh; reload the page to see it.`);
    } catch {
      setStatus("Could not confirm whether the save completed. Reload the template list before retrying.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTemplate(template: Template) {
    if (!template.id || !window.confirm(`Permanently delete “${template.name}”? Past campaign and delivery records will remain, but their link to this template will be cleared.`)) return;
    setDeletingId(template.id);
    try {
      const response = await fetch(`/api/admin/email-templates?id=${encodeURIComponent(template.id)}`, { method: "DELETE" });
      const json = await response.json();
      if (!response.ok) {
        setStatus(json.error?.message ?? "Template could not be deleted.");
        return;
      }
      if (form.id === template.id) {
        setForm({ ...blank, content_blocks: [] });
        setSelectedWishTitle("");
        setPreviewHtml("");
      }
      const refreshed = await load(false);
      setStatus(refreshed
        ? `Deleted “${template.name}”. Past delivery records were retained.`
        : `Deleted “${template.name}”, but the saved-template list could not refresh. Reload the page.`);
    } catch {
      setStatus("Could not confirm whether deletion completed. Reload the saved-template list before trying again.");
    } finally {
      setDeletingId(null);
    }
  }

  const headlineCount = form.content_blocks.filter((block) => block.type === "headline").length;
  const messageCount = form.content_blocks.filter((block) => block.type === "message").length;
  const imageCount = form.content_blocks.filter((block) => block.type === "image").length;
  const blockButtonCount = form.content_blocks.reduce((count, block) => count + (block.type === "button" || (block.type === "image" && Boolean(block.overlay_button_label?.trim() && block.overlay_button_url)) ? 1 : 0), 0);
  const canAddBlock = form.content_blocks.length < MAX_CONTENT_BLOCKS;

  return (
    <div className="content">
      <div className="section-head">
        <div>
          <p className="eyebrow">Communications / central library</p>
          <h2>Email templates</h2>
          <p className="muted">Create birthday, marketing and occasion templates. Occasion emails support ordered content, flexible images and button placement, plus preview before saving.</p>
        </div>
        <Link className="btn light" href="/dashboard/marketing">Go to send emails</Link>
      </div>

      <section className="card" style={{ marginBottom: 18 }}>
        <p className="eyebrow">Start from a wish or occasion</p>
        <p className="muted">All {WISH_PRESETS.length} provided titles are listed below. Select any title once to start its Occasion draft; nothing is sent automatically.</p>
        <ol className="wish-presets-grid" aria-label="110 wish and occasion titles">
          {WISH_PRESETS.map((title, index) => (
            <li key={title}>
              <button className="wish-preset-button" type="button" aria-pressed={selectedWishTitle === title} onClick={() => startFromWish(title)}>
                <span className="wish-preset-number">{String(index + 1).padStart(2, "0")}</span><span>{title}</span>
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
              <div className="saved-template-row" key={template.id}>
                <div className="saved-template-info">
                  <strong>{template.name}</strong>
                  <span className="muted">{template.template_type} · {template.theme} · {template.updated_at ? new Date(template.updated_at).toLocaleString() : ""}</span>
                </div>
                <div className="saved-template-actions">
                  <button className="btn light" type="button" disabled={Boolean(deletingId) || saving || previewing} onClick={() => edit(template)}>Edit</button>
                  <button className="btn template-delete-button" type="button" disabled={Boolean(deletingId) || saving || previewing} onClick={() => void deleteTemplate(template)}>{deletingId === template.id ? "Deleting…" : "Delete"}</button>
                </div>
              </div>
            ))}
            {!templates.length && <span className="muted">No templates saved yet.</span>}
          </div>
          <button className="btn light" type="button" onClick={() => { setSelectedWishTitle(""); setPreviewHtml(""); setForm({ ...blank, content_blocks: [] }); setStatus("Creating a new template."); }}>+ New template</button>
        </section>

        <section className="card">
          <p className="eyebrow">Template editor</p>
          <div className="two-col">
            <label className="field-label">Name<input className="input" value={form.name} onChange={(event) => update("name", event.target.value)} /></label>
            <label className="field-label">Type
              <select className="input" value={form.template_type} onChange={(event) => changeTemplateType(event.target.value as Template["template_type"])}>
                <option value="marketing">Marketing email</option><option value="occasion">Festival / occasion email</option><option value="birthday">Birthday email</option>
              </select>
            </label>
          </div>
          <label className="field-label">Theme
            <select className="input" value={form.theme} onChange={(event) => update("theme", event.target.value as Template["theme"])}>
              <option value="dark">Dark · black background / white text</option><option value="light">Light · white background / black text</option>
            </select>
          </label>
          <label className="field-label">Subject<input className="input" value={form.subject} onChange={(event) => update("subject", event.target.value)} /></label>
          <label className="field-label">Preheader<input className="input" value={form.preview_text} onChange={(event) => update("preview_text", event.target.value)} /></label>

          {form.template_type === "occasion" ? (
            <section className="content-block-editor">
              <p className="eyebrow">Email content · {form.content_blocks.length}/{MAX_CONTENT_BLOCKS} blocks</p>
              <p className="muted">Use Up/Down to set the final email order—including whether a button or image is above or below each headline/message. For side layouts, place the image immediately before the headline/message it should sit beside.</p>
              <div className="content-block-tools">
                <button className="btn light" type="button" disabled={!canAddBlock} onClick={() => addContentBlock("headline")}>+ Add headline</button>
                <button className="btn light" type="button" disabled={!canAddBlock} onClick={() => addContentBlock("message")}>+ Add message</button>
                <button className="btn light" type="button" disabled={!canAddBlock || blockButtonCount >= MAX_CONTENT_BUTTONS} onClick={() => addContentBlock("button")}>+ Add button · {blockButtonCount}/{MAX_CONTENT_BUTTONS}</button>
                <button className="btn light" type="button" disabled={!canAddBlock || imageCount >= MAX_CONTENT_IMAGES} onClick={() => addContentBlock("image")}>+ Add image · {imageCount}/{MAX_CONTENT_IMAGES}</button>
              </div>
              <div className="content-block-list">
                {form.content_blocks.map((block, index) => {
                  const ordinal = form.content_blocks.slice(0, index + 1).filter((item) => item.type === block.type).length;
                  const label = block.type === "headline" ? `Headline ${ordinal}` : block.type === "message" ? `Message ${ordinal}` : block.type === "button" ? `Button ${ordinal}` : `Image ${ordinal}`;
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
                      {(block.type === "headline" || block.type === "message") && (
                        <>
                          {block.type === "headline" ? (
                            <label className="field-label">Headline text<input className="input" maxLength={180} value={block.text} onChange={(event) => updateContentBlock(index, { text: event.target.value })} placeholder="Add a headline" /></label>
                          ) : (
                            <label className="field-label">Message text<textarea className="input" rows={5} maxLength={10000} value={block.text} onChange={(event) => updateContentBlock(index, { text: event.target.value })} placeholder="Write the email message" /><span className="muted">Use <code>{"{{name}}"}</code> for personalization.</span></label>
                          )}
                          <label className="field-label">Text alignment<select className="input" value={block.align ?? "left"} onChange={(event) => updateContentBlock(index, { align: event.target.value })}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
                        </>
                      )}
                      {block.type === "button" && (
                        <>
                          <div className="content-block-button-fields">
                            <label className="field-label">Button label<input className="input" maxLength={80} value={block.label} onChange={(event) => updateContentBlock(index, { label: event.target.value })} placeholder="Button label" /></label>
                            <label className="field-label">Button URL<input className="input" value={block.url} onChange={(event) => updateContentBlock(index, { url: event.target.value })} placeholder="https://…" /></label>
                          </div>
                          <div className="content-block-button-fields">
                            <label className="field-label">Button alignment<select className="input" value={block.align ?? "left"} onChange={(event) => updateContentBlock(index, { align: event.target.value })}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
                            <label className="field-label">Button width<select className="input" value={block.width ?? "auto"} onChange={(event) => updateContentBlock(index, { width: event.target.value })}><option value="auto">Fit label</option><option value="full">Full width</option></select></label>
                          </div>
                        </>
                      )}
                      {block.type === "image" && (
                        <>
                          <label className="field-label">Image URL<input className="input" value={block.url} onChange={(event) => updateContentBlock(index, { url: event.target.value })} placeholder="https://…" /></label>
                          <div className="content-block-image-fields">
                            <label className="field-label">Image size<select className="input" value={block.size ?? "medium"} onChange={(event) => updateContentBlock(index, { size: event.target.value })}><option value="small">Small · max 220 px</option><option value="medium">Medium · max 360 px</option><option value="large">Large · max 520 px</option><option value="banner">Banner · full width</option></select></label>
                            <label className="field-label">Placement<select className="input" value={block.layout ?? "full"} onChange={(event) => updateContentBlock(index, { layout: event.target.value })}><option value="full">Full-width row</option><option value="side-left">Left of next text block</option><option value="side-right">Right of next text block</option></select></label>
                            <label className="field-label">Image alignment<select className="input" value={block.align ?? "center"} onChange={(event) => updateContentBlock(index, { align: event.target.value })}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
                          </div>
                          {(block.layout === "side-left" || block.layout === "side-right") && <p className="muted image-layout-hint">The image will pair with the next headline/message block. On mobile, email clients may keep this as two columns.</p>}
                          <label className="content-block-toggle"><input type="checkbox" checked={block.overlay_enabled ?? false} onChange={(event) => updateContentBlock(index, { overlay_enabled: event.target.checked })} /> Show text/button over image</label>
                          {block.overlay_enabled && (
                            <div className="image-overlay-editor">
                              <label className="field-label">Overlay title<input className="input" maxLength={180} value={block.overlay_title ?? ""} onChange={(event) => updateContentBlock(index, { overlay_title: event.target.value })} placeholder="Title on image; use {{name}} if needed" /></label>
                              <label className="field-label">Overlay subtitle<textarea className="input" rows={3} maxLength={360} value={block.overlay_subtitle ?? ""} onChange={(event) => updateContentBlock(index, { overlay_subtitle: event.target.value })} placeholder="Optional subtitle" /></label>
                              <div className="content-block-image-fields">
                                <label className="field-label">Overlay text alignment<select className="input" value={block.overlay_align ?? "center"} onChange={(event) => updateContentBlock(index, { overlay_align: event.target.value })}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
                                <label className="field-label">Overlay vertical position<select className="input" value={block.overlay_position ?? "middle"} onChange={(event) => updateContentBlock(index, { overlay_position: event.target.value })}><option value="top">Top</option><option value="middle">Middle</option><option value="bottom">Bottom</option></select></label>
                              </div>
                              <div className="content-block-button-fields">
                                <label className="field-label">Overlay button label<input className="input" maxLength={80} value={block.overlay_button_label ?? ""} onChange={(event) => updateContentBlock(index, { overlay_button_label: event.target.value })} placeholder="Optional CTA label" /></label>
                                <label className="field-label">Overlay button URL<input className="input" value={block.overlay_button_url ?? ""} onChange={(event) => updateContentBlock(index, { overlay_button_url: event.target.value })} placeholder="https://…" /></label>
                              </div>
                              <p className="muted">Overlay uses table/VML compatibility markup. Email apps differ; review the preview and send a test email before a large send.</p>
                            </div>
                          )}
                        </>
                      )}
                    </section>
                  );
                })}
                {!form.content_blocks.length && <p className="muted">Add at least one headline and one message block. Images and buttons are optional.</p>}
              </div>
              <p className="muted">Current blocks: {headlineCount} headline(s), {messageCount} message(s), {imageCount} image(s), {blockButtonCount} button(s).</p>
            </section>
          ) : (
            <>
              <label className="field-label">Headline<input className="input" value={form.headline} onChange={(event) => update("headline", event.target.value)} /></label>
              <label className="field-label">Message<textarea className="input" rows={8} value={form.message} onChange={(event) => update("message", event.target.value)} /><span className="muted">Use <code>{"{{name}}"}</code> for personalization.</span></label>
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

          {form.template_type !== "occasion" && (
            <>
              <p className="eyebrow">Images · {form.images.length}/8</p>
              {form.images.map((image, index) => (
                <div className="image-slot" key={index}>
                  <input className="input" placeholder="https://…" value={image.url} onChange={(event) => { const items = [...form.images]; items[index] = { ...items[index], url: event.target.value }; update("images", items); }} />
                  <select className="input" value={image.position} onChange={(event) => { const items = [...form.images]; items[index] = { ...items[index], position: event.target.value }; update("images", items); }}>
                    {legacyImagePositions.map((position) => <option key={position} value={position}>{position}</option>)}
                  </select>
                  <button className="btn light" type="button" onClick={() => update("images", form.images.filter((_, itemIndex) => itemIndex !== index))}>Remove image</button>
                </div>
              ))}
              <button className="btn light" type="button" disabled={form.images.length >= 8} onClick={() => update("images", [...form.images, { url: "", position: "after_message" }])}>+ Add image</button>
            </>
          )}

          <section className="template-preview-panel">
            <div className="template-preview-head">
              <div><p className="eyebrow">Unsaved email preview</p><p className="muted">Preview uses the current editor fields. It does not save or send email.</p></div>
              <button className="btn light" type="button" disabled={previewing || saving} onClick={() => void preview()}>{previewing ? "Building preview…" : "Preview before saving"}</button>
            </div>
            {previewHtml && <><p className="template-preview-subject"><strong>Subject:</strong> {form.subject || "(no subject yet)"}</p><iframe className="email-preview-render" title="Unsaved email template preview" sandbox="" referrerPolicy="no-referrer" srcDoc={previewHtml} /></>}
          </section>
          <div className="actions"><button className="btn" type="button" disabled={saving || previewing} onClick={() => void save()}>{saving ? "Saving…" : "Save template"}</button></div>
          {status && <p className="muted" role="status" aria-live="polite">{status}</p>}
        </section>
      </div>
    </div>
  );
}
