/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import nodemailer from "nodemailer";
import { getAdminApiContext } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail } from "@/lib/api/response";

function escape(value: string) { return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] ?? char)); }
function canSend(access: { roles?: unknown; permissions?: unknown } | null) { return Array.isArray(access?.roles) && access.roles.includes("super_admin") || Array.isArray(access?.permissions) && access.permissions.includes("marketing.send"); }
function buildEmail(input: { subject: string; preheader: string; headline: string; message: string; button_label?: string; button_url?: string }) {
  const button = input.button_label && input.button_url ? `<p><a href="${escape(input.button_url)}" style="color:#fff;font-weight:700;text-decoration:underline;">${escape(input.button_label)} →</a></p>` : "";
  return `<div style="background:#000;color:#fff;font-family:Arial,sans-serif;padding:36px 22px;line-height:1.7"><div style="max-width:560px;margin:auto"><p style="font-size:10px;letter-spacing:2px;text-transform:uppercase">BINZEO · NEWS</p><p style="color:#aaa;font-size:12px">${escape(input.preheader)}</p><h1 style="font-size:28px;line-height:1.2">${escape(input.headline)}</h1><div style="font-size:15px;white-space:pre-wrap">${escape(input.message).replace(/\n/g, "<br>")}</div>${button}<hr style="border:0;border-top:1px solid #444;margin:28px 0"><p style="font-size:11px;color:#aaa">You are receiving this marketing email because you allowed Marketing emails in your BINZEO notification preferences.</p><p style="font-size:10px;color:#777">© ${new Date().getFullYear()} BINZEO Inc. All rights reserved.</p></div></div>`;
}
async function getRecipients(admin: ReturnType<typeof createAdminClient>) {
  const { data: profiles, error } = await (admin.from("profiles") as any).select("id,display_name,marketing_email,account_status").eq("marketing_email", true).eq("account_status", "active").limit(500);
  if (error) throw error;
  const recipients: { user_id: string; email: string; display_name: string | null }[] = [];
  for (const profile of profiles ?? []) {
    const result = await admin.auth.admin.getUserById(profile.id);
    if (result.data.user?.email) recipients.push({ user_id: profile.id, email: result.data.user.email, display_name: profile.display_name });
  }
  return recipients;
}
export async function GET() {
  const { access } = await getAdminApiContext();
  if (!canSend(access)) return fail("Marketing email permission required", 403, "MARKETING_SEND_REQUIRED");
  try { return ok({ recipient_count: (await getRecipients(createAdminClient())).length }); } catch (error) { return fail(error instanceof Error ? error.message : "Could not load recipients", 500, "RECIPIENTS_FAILED"); }
}
export async function POST(req: NextRequest) {
  const { user, access } = await getAdminApiContext();
  if (!user || !canSend(access)) return fail("Marketing email permission required", 403, "MARKETING_SEND_REQUIRED");
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const subject = typeof body.subject === "string" ? body.subject.trim().slice(0, 180) : "";
  const preheader = typeof body.preheader === "string" ? body.preheader.trim().slice(0, 240) : "";
  const headline = typeof body.headline === "string" ? body.headline.trim().slice(0, 180) : "";
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 10000) : "";
  const button_label = typeof body.button_label === "string" ? body.button_label.trim().slice(0, 80) : "";
  const button_url = typeof body.button_url === "string" ? body.button_url.trim().slice(0, 500) : "";
  if (!subject || !headline || !message) return fail("Subject, headline and message are required", 422, "VALIDATION_ERROR");
  const html = buildEmail({ subject, preheader, headline, message, button_label, button_url });
  if (body.action === "preview") return ok({ subject, html, recipient_count: (await getRecipients(createAdminClient())).length });
  if (body.action !== "send") return fail("Choose preview or send", 422, "VALIDATION_ERROR");
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return fail("SMTP is not configured on the Admin project. Preview is available, sending is disabled until SMTP variables are added.", 503, "SMTP_NOT_CONFIGURED");
  const admin = createAdminClient();
  const recipients = await getRecipients(admin);
  const { data: campaign, error: campaignError } = await (admin.from("marketing_email_campaigns") as any).insert({ subject, preview_text: preheader, html_body: html, created_by: user.id, status: "sending", recipient_count: recipients.length, started_at: new Date().toISOString() }).select("id").single();
  if (campaignError || !campaign) return fail(campaignError?.message ?? "Campaign could not be created", 500, "CAMPAIGN_CREATE_FAILED");
  const { error: deliveryError } = await (admin.from("marketing_email_deliveries") as any).insert(recipients.map((recipient) => ({ campaign_id: campaign.id, user_id: recipient.user_id, email: recipient.email, consent_snapshot: true, status: "pending" })));
  if (deliveryError) return fail(deliveryError.message, 500, "DELIVERY_CREATE_FAILED");
  const transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT ?? 587), secure: false, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
  let sent = 0; let failed = 0;
  for (const recipient of recipients) {
    try {
      const info = await transporter.sendMail({ from: `BINZEO <${process.env.SMTP_USER}>`, to: recipient.email, subject, html });
      sent += 1;
      await (admin.from("marketing_email_deliveries") as any).update({ status: "sent", sent_at: new Date().toISOString(), provider_message_id: info.messageId ?? null }).eq("campaign_id", campaign.id).eq("email", recipient.email);
    } catch (error) {
      failed += 1;
      await (admin.from("marketing_email_deliveries") as any).update({ status: "failed", error_message: error instanceof Error ? error.message : "Send failed" }).eq("campaign_id", campaign.id).eq("email", recipient.email);
    }
  }
  await (admin.from("marketing_email_campaigns") as any).update({ status: failed ? (sent ? "partial" : "failed") : "sent", sent_count: sent, failed_count: failed, completed_at: new Date().toISOString() }).eq("id", campaign.id);
  await admin.from("admin_activity_logs").insert([{ admin_user_id: user.id, action_type: "marketing_campaign_sent", target_type: "marketing_email_campaign", target_id: campaign.id, description: `Marketing campaign sent to users who allowed marketing emails. Sent ${sent}, failed ${failed}.`, metadata: { sent, failed, recipient_count: recipients.length, consent_filter: "profiles.marketing_email = true and account_status = active" } }] as never);
  return ok({ campaign_id: campaign.id, recipient_count: recipients.length, sent, failed });
}
