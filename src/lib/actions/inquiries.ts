"use server";

import { after } from "next/server";
import { execute, query } from "../db";
import { INQUIRY_KINDS, isInquiryKind } from "../inquiries";
import { mailEnabled, sendMail } from "../mail";
import { clean } from "../text";
import { clientIp, limited, record } from "../throttle";

export type InquiryState = { error?: string; sent?: boolean; fields?: Record<string, string> } | null;

const esc = (text: string) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/**
 * The Collaborate and Brand deals forms. Anyone can send one — no account is
 * needed — so everything is checked here, and one address can only send a few
 * an hour.
 */
export async function sendInquiry(_prev: InquiryState, formData: FormData): Promise<InquiryState> {
  const kind = formData.get("kind");
  if (!isInquiryKind(kind)) return { error: "Something went wrong. Please reload the page and try again." };
  const options = INQUIRY_KINDS[kind];

  const name = clean(formData.get("name"), 100);
  const email = clean(formData.get("email"), 100).toLowerCase();
  const company = clean(formData.get("company"), 120);
  let website = clean(formData.get("website"), 200);
  const topicInput = clean(formData.get("topic"), 60);
  const budgetInput = clean(formData.get("budget"), 40);
  const message = String(formData.get("message") ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, 4000);
  const fields = { name, email, company, website, topic: topicInput, budget: budgetInput, message };

  // A field people never see. Only a program filling in every box completes
  // it — it is told "sent" and nothing is stored.
  if (clean(formData.get("fax"), 50)) return { sent: true };

  const errors: string[] = [];
  if (name.length < 2) errors.push("Please tell us your name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Please enter a valid email address, so we can reply.");
  if (kind === "brand" && company.length < 2) errors.push("Please tell us the brand or company.");
  if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
  if (website && !/^https?:\/\/[^\s/]+\.[^\s]+$/i.test(website)) errors.push("That link doesn't look right. Leave it empty if you don't have one.");
  if (message.length < 20) errors.push("Please write a little more about what you have in mind (at least 20 characters).");
  if (errors.length) return { error: errors.join(" "), fields };

  const topic = (options.topics as readonly string[]).includes(topicInput) ? topicInput : "";
  const budget = (options.budgets as readonly string[]).includes(budgetInput) ? budgetInput : "";

  const ipKey = `inquiry-ip:${await clientIp()}`;
  if (await limited(ipKey, 3, 60)) return { error: "You've sent a few messages already. Please wait an hour before sending another.", fields };
  await record(ipKey);

  await execute("INSERT INTO inquiries (kind, name, email, company, website, topic, budget, message) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [kind, name, email, company, website, topic, budget, message]);

  // Tell the administrators by email, if email is set up. After the reply has
  // gone out, so a slow mail service never keeps the visitor waiting.
  if (mailEnabled()) {
    after(async () => {
      const admins = await query<{ email: string }>("SELECT email FROM users WHERE role = 'admin' AND is_active = 1 ORDER BY id LIMIT 3");
      const rows = [["From", `${name} <${email}>`], ["Company", company], ["Link", website], ["About", topic], ["Budget", budget]].filter(([, value]) => value);
      const text = `${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${message}\n\nOpen the inbox in the admin area to reply.`;
      const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#222">${rows.map(([k, v]) => `<p style="margin:0"><b>${esc(k)}:</b> ${esc(v)}</p>`).join("")}<p style="white-space:pre-wrap;margin:16px 0;padding:14px;background:#f4f4f4;border-radius:10px">${esc(message)}</p><p style="color:#777">Open the inbox in the admin area to reply.</p></div>`;
      for (const admin of admins) await sendMail({ to: admin.email, subject: `New ${options.label.toLowerCase()} message from ${name}`, html, text });
    });
  }
  return { sent: true };
}
