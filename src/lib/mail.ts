import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Email goes out through Resend (https://resend.com) — one HTTPS request per
// message, no library needed. Everything that sends mail calls sendMail(), so
// switching provider later means changing only this file.
//
// Needs RESEND_API_KEY and EMAIL_FROM (an address on a domain verified in
// Resend, e.g. "HabitFlow <hello@yourdomain.com>").

// (overridable only so sending can be tested against a stand-in server)
const API_URL = process.env.RESEND_API_URL ?? "https://api.resend.com/emails";

export const mailEnabled = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

export type Lang = "ne" | "en";

/** Nepali for people in Nepal, English elsewhere — unless they chose one in Profile. */
export function emailLang(user: { email_lang?: string | null; timezone?: string | null }): Lang {
  // English unless the person has chosen another language in Profile
  return user.email_lang === "ne" ? "ne" : "en";
}

export async function sendMail(message: { to: string; subject: string; html: string; text: string; unsubscribeUrl?: string }): Promise<boolean> {
  if (!mailEnabled()) return false;
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        // lets mail apps show their own "Unsubscribe" button on reminders
        ...(message.unsubscribeUrl ? { headers: { "List-Unsubscribe": `<${message.unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// ── Unsubscribe links ────────────────────────────────────────────────────────
// The link in a reminder must work without signing in, so it carries a
// signature only this server can produce: nobody can unsubscribe someone else
// by guessing a user id.

const sign = (userId: number) => createHmac("sha256", process.env.SESSION_SECRET ?? "").update(`unsubscribe:${userId}`).digest("base64url");

export const unsubscribeUrl = (origin: string, userId: number) => `${origin}/api/unsubscribe?u=${userId}&k=${sign(userId)}`;

export function validUnsubscribe(userId: number, key: string): boolean {
  const expected = Buffer.from(sign(userId));
  const given = Buffer.from(key);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

// ── Messages ─────────────────────────────────────────────────────────────────

const esc = (text: string) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/**
 * The one layout every email uses. It fills the whole width of the message —
 * no grey margin around a small card — with a dark banner across the top, the
 * content below it, one large button, and a dark footer.
 *
 * Built the way email has to be: tables and inline styles only (mail apps
 * ignore stylesheets), and no pictures to download, so it looks the same
 * whether or not the reader's app shows images.
 */
function layout({ heading, lines, button, footer }: { heading: string; lines: string[]; button?: { label: string; url: string }; footer: string[] }) {
  const font = "-apple-system,'Segoe UI','Noto Sans Devanagari',Roboto,Helvetica,Arial,sans-serif";
  const origin = button ? new URL(button.url).origin : "https://habitflow.hellnah.dev";
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:${font};color:#111111;-webkit-text-size-adjust:100%">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;background:#ffffff">
<tr><td style="background:#0b1020;background-image:linear-gradient(135deg,#0b1020 0%,#16224a 60%,#2563eb 140%);padding:28px 24px 30px">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
    <td style="width:38px;height:38px;border-radius:11px;background:#2563eb;text-align:center;vertical-align:middle;font-size:20px;line-height:38px;color:#ffffff;font-weight:800">&#10003;</td>
    <td style="padding-left:12px;font-size:19px;font-weight:800;letter-spacing:0.5px;color:#ffffff">HabitFlow</td>
  </tr></table>
  <h1 style="margin:22px 0 0;font-size:27px;line-height:1.25;font-weight:800;color:#ffffff">${esc(heading)}</h1>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:16px"><tr>
    ${[1, 1, 1, 0, 1, 1, 1].map((on) => `<td style="width:26px;height:6px;border-radius:3px;background:${on ? "#60a5fa" : "#334155"};font-size:0;line-height:0">&nbsp;</td><td style="width:5px;font-size:0;line-height:0">&nbsp;</td>`).join("")}
  </tr></table>
</td></tr>
<tr><td style="padding:28px 24px 8px">
${lines.map((line) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:#1f2937">${line}</p>`).join("\n")}
${button ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:10px 0 22px"><tr><td align="center" style="background:#2563eb;border-radius:14px"><a href="${esc(button.url)}" style="display:block;padding:17px 20px;font-size:16px;font-weight:800;color:#ffffff;text-decoration:none;font-family:${font}">${esc(button.label)} &rarr;</a></td></tr></table>` : ""}
</td></tr>
<tr><td style="padding:0 24px 26px">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="background:#eff6ff;border-left:4px solid #2563eb;border-radius:0 12px 12px 0;padding:14px 16px;font-size:14px;line-height:1.55;color:#1e3a8a"><b>Small steps, every day.</b> One tick today is worth more than a perfect plan for tomorrow.</td></tr></table>
</td></tr>
<tr><td style="background:#0b1020;padding:22px 24px 26px">
${footer.map((line) => `<p style="margin:0 0 10px;font-size:12.5px;line-height:1.6;color:#94a3b8">${line.replace(/color:#888/g, "color:#cbd5e1")}</p>`).join("\n")}
  <p style="margin:12px 0 0;font-size:12.5px;line-height:1.6;color:#64748b"><a href="${esc(origin)}" style="color:#93c5fd;text-decoration:none;font-weight:700">HabitFlow</a> &middot; Free habit tracker &middot; <a href="${esc(origin)}/privacy" style="color:#94a3b8">Privacy</a></p>
</td></tr>
</table></body></html>`;
  // plain-text copy: links keep their address ("label: https://…"), other tags are dropped
  const strip = (s: string) => s.replace(/<a href="([^"]+)"[^>]*>(.*?)<\/a>/g, "$2: $1").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&");
  const text = [heading, "", ...lines.map(strip), ...(button ? ["", `${button.label}: ${button.url}`] : []), "", ...footer.map(strip)].join("\n");
  return { html, text };
}

export function verificationEmail(lang: Lang, code: string) {
  const big = `<span style="display:block;text-align:center;font-size:38px;font-weight:800;letter-spacing:12px;color:#0b1020;background:#eff6ff;border:2px dashed #2563eb;border-radius:14px;padding:18px 8px">${esc(code)}</span>`;
  return lang === "ne"
    ? { subject: `${code} — तपाईंको HabitFlow प्रमाणीकरण कोड`, ...layout({ heading: "आफ्नो इमेल प्रमाणित गर्नुहोस्", lines: ["HabitFlow खाता बनाउन यो कोड प्रयोग गर्नुहोस्:", big, "यो कोड १० मिनेटसम्म मात्र काम गर्छ।"], footer: ["यदि तपाईंले यो अनुरोध गर्नुभएको होइन भने, यो इमेललाई बेवास्ता गर्नुहोस्।"] }) }
    : { subject: `${code} is your HabitFlow verification code`, ...layout({ heading: "Verify your email", lines: ["Use this code to finish creating your HabitFlow account:", big, "It works for 10 minutes."], footer: ["If you didn't ask for this, you can ignore this email."] }) };
}

export function resetEmail(lang: Lang, name: string, url: string) {
  return lang === "ne"
    ? { subject: "HabitFlow पासवर्ड रिसेट गर्नुहोस्", ...layout({ heading: `नमस्ते ${name},`, lines: ["तपाईंको HabitFlow पासवर्ड रिसेट गर्न अनुरोध आएको छ। नयाँ पासवर्ड राख्न तलको बटन थिच्नुहोस्।", "यो लिङ्क ३० मिनेटसम्म मात्र काम गर्छ र एक पटक मात्र प्रयोग गर्न सकिन्छ।"], button: { label: "नयाँ पासवर्ड राख्नुहोस्", url }, footer: ["यदि तपाईंले यो अनुरोध गर्नुभएको होइन भने, केही गर्नु पर्दैन — तपाईंको पासवर्ड जस्ताको तस्तै रहन्छ।"] }) }
    : { subject: "Reset your HabitFlow password", ...layout({ heading: `Hi ${name},`, lines: ["Someone asked to reset the password for your HabitFlow account. Press the button below to choose a new one.", "The link works for 30 minutes and can be used once."], button: { label: "Choose a new password", url }, footer: ["If this wasn't you, there's nothing to do — your password stays as it is."] }) };
}

export function googleAccountEmail(lang: Lang, name: string, url: string) {
  return lang === "ne"
    ? { subject: "तपाईंको HabitFlow खाता", ...layout({ heading: `नमस्ते ${name},`, lines: ["तपाईंको खाता Google मार्फत खोलिएको हो, त्यसैले यसको छुट्टै पासवर्ड छैन।", "साइन इन गर्न “Continue with Google” थिच्नुहोस्।"], button: { label: "साइन इन गर्नुहोस्", url }, footer: ["यदि तपाईंले यो अनुरोध गर्नुभएको होइन भने, यो इमेललाई बेवास्ता गर्नुहोस्।"] }) }
    : { subject: "Your HabitFlow account", ...layout({ heading: `Hi ${name},`, lines: ["Your account was created with Google, so it has no password of its own.", "To sign in, use “Continue with Google”."], button: { label: "Sign in", url }, footer: ["If you didn't ask for this, you can ignore this email."] }) };
}

/** To the administrators, when the database is filling up (at most once a day). */
export function storageEmail(info: { full: boolean; used: string; limit: string; percent: number; url: string }) {
  return {
    subject: info.full ? `HabitFlow: storage is full (${info.percent}%) — uploads are paused` : `HabitFlow: storage is ${info.percent}% full`,
    ...layout({
      heading: info.full ? "Storage is full: uploads are paused" : "Storage is filling up",
      lines: [
        `The database is using <b>${esc(info.used)}</b> of the <b>${esc(info.limit)}</b> your plan allows (${info.percent}%).`,
        info.full ? "New photos, pictures and sounds are being refused until there is room. Habits, ticks and sign-ins keep working." : "At 95% new photos, pictures and sounds will be paused so the site itself keeps working.",
        "To make room: move to a larger database plan (then raise the limit in Admin → Overview), or delete accounts and pictures that are no longer needed.",
      ],
      button: { label: "Open the admin overview", url: info.url },
      footer: ["Sent by the site's own storage check, once a day while this is the case."],
    }),
  };
}

/** Sent once, a week after someone's last tick: a kind note, not a telling-off. */
export function comebackEmail(lang: Lang, info: { name: string; days: number; url: string; unsubscribe: string }) {
  return lang === "ne"
    ? {
        subject: `${info.name}, तपाईंका बानी पर्खिरहेका छन्`,
        ...layout({
          heading: `${info.name}, फेरि सुरु गर्ने?`,
          lines: [`अन्तिम पटक टिक लगाएको <b>${info.days}</b> दिन भयो। केही बिग्रिएको छैन — एक दिन छुट्नु सामान्य हो, फर्किनु नै असली कुरा हो।`, "आज एउटा मात्र बानी पूरा गर्नुहोस्। सानो भए पनि हुन्छ।"],
          button: { label: "आजको सूची खोल्नुहोस्", url: info.url },
          footer: [`यो एक पटक मात्र पठाइएको सम्झना हो। <a href="${esc(info.unsubscribe)}" style="color:#888">इमेल बन्द गर्नुहोस्</a>`],
        }),
      }
    : {
        subject: `${info.name}, your habits are waiting`,
        ...layout({
          heading: `Ready to pick it back up, ${info.name}?`,
          lines: [`It's been <b>${info.days}</b> days since your last tick. Nothing is broken: everyone misses days. Coming back is the part that counts.`, "Do just one habit today. The smallest version is fine."],
          button: { label: "Open today's list", url: info.url },
          footer: [`This is a one-off note, not a daily email. <a href="${esc(info.unsubscribe)}" style="color:#888">Turn emails off</a>`],
        }),
      };
}

export function arcReminderEmail(lang: Lang, info: { name: string; day: number; totalDays: number; left: number; streak: number; url: string; unsubscribe: string }) {
  const ne = lang === "ne";
  const streak = info.streak > 0 ? (ne ? `तपाईंको ${info.streak} दिनको स्ट्रिक जोगाउनुहोस्।` : `Keep your ${info.streak}-day streak alive.`) : ne ? "आजबाट नयाँ स्ट्रिक सुरु गर्नुहोस्।" : "Start a new streak today.";
  return ne
    ? {
        subject: `Winter Arc · दिन ${info.day}: आजका ${info.left} बानी बाँकी छन्`,
        ...layout({
          heading: `${info.name}, आजको दिन अझै सकिएको छैन`,
          lines: [`Winter Arc को दिन <b>${info.day}</b> / ${info.totalDays}। आजका <b>${info.left}</b> बानी अझै पूरा गर्न बाँकी छन्।`, streak, "मध्यरात अघि टिक गर्नुभयो भने मात्र आजको अङ्क जोडिन्छ।"],
          button: { label: "आजका बानी पूरा गर्नुहोस्", url: info.url },
          footer: [`यो रिमाइन्डर तपाईं Winter Arc मा सहभागी हुनुभएकोले पठाइएको हो। <a href="${esc(info.unsubscribe)}" style="color:#888">रिमाइन्डर बन्द गर्नुहोस्</a>`],
        }),
      }
    : {
        subject: `Winter Arc · Day ${info.day}: ${info.left} habit${info.left === 1 ? "" : "s"} left today`,
        ...layout({
          heading: `${info.name}, today isn't finished yet`,
          lines: [`It's day <b>${info.day}</b> of ${info.totalDays} of the Winter Arc, and <b>${info.left}</b> of today's habits ${info.left === 1 ? "is" : "are"} still open.`, streak, "Only ticks made before midnight count toward today's points."],
          button: { label: "Finish today's habits", url: info.url },
          footer: [`You're getting this because you joined the Winter Arc. <a href="${esc(info.unsubscribe)}" style="color:#888">Turn reminders off</a>`],
        }),
      };
}
