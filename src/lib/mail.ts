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

/** One plain layout for every email: black on white, a single button, a short footer. */
function layout({ heading, lines, button, footer }: { heading: string; lines: string[]; button?: { label: string; url: string }; footer: string[] }) {
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f4f4f4;font-family:-apple-system,'Segoe UI','Noto Sans Devanagari',Roboto,sans-serif;color:#111">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;padding:32px" cellspacing="0" cellpadding="0"><tr><td>
<p style="margin:0 0 20px;font-size:13px;font-weight:700;letter-spacing:2px;color:#111">HABITFLOW</p>
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#111">${esc(heading)}</h1>
${lines.map((line) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#333">${line}</p>`).join("\n")}
${button ? `<p style="margin:24px 0"><a href="${esc(button.url)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:10px">${esc(button.label)}</a></p>` : ""}
${footer.map((line) => `<p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#888">${line}</p>`).join("\n")}
</td></tr></table></td></tr></table></body></html>`;
  // plain-text copy: links keep their address ("label: https://…"), other tags are dropped
  const strip = (s: string) => s.replace(/<a href="([^"]+)"[^>]*>(.*?)<\/a>/g, "$2: $1").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&");
  const text = [heading, "", ...lines.map(strip), ...(button ? ["", `${button.label}: ${button.url}`] : []), "", ...footer.map(strip)].join("\n");
  return { html, text };
}

export function verificationEmail(lang: Lang, code: string) {
  const big = `<span style="display:inline-block;font-size:30px;font-weight:700;letter-spacing:8px;color:#111;background:#f4f4f4;border-radius:10px;padding:12px 18px">${esc(code)}</span>`;
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
