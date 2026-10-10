// Spotting email addresses that will never receive anything: throwaway
// inboxes, made-up ones, and slips of the finger in a well-known name.
// Shared by the sign-up form (as the address is typed) and the server.

/** Services that hand out inboxes meant to be thrown away. */
const DISPOSABLE = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "guerrillamail.org", "sharklasers.com", "grr.la", "10minutemail.com", "10minutemail.net",
  "tempmail.com", "temp-mail.org", "temp-mail.io", "tempmail.net", "tempmailo.com", "tempail.com", "throwawaymail.com", "trashmail.com", "trashmail.net",
  "yopmail.com", "yopmail.net", "yopmail.fr", "getnada.com", "nada.email", "dispostable.com", "maildrop.cc", "mailnesia.com", "mintemail.com",
  "fakeinbox.com", "fakemail.net", "fakemailgenerator.com", "emailondeck.com", "moakt.com", "mohmal.com", "mytemp.email", "spamgourmet.com",
  "tempinbox.com", "tempr.email", "discard.email", "discardmail.com", "mailcatch.com", "mailsac.com", "inboxkitten.com", "burnermail.io",
  "getairmail.com", "harakirimail.com", "mailpoof.com", "luxusmail.org", "1secmail.com", "1secmail.net", "1secmail.org", "emailfake.com",
  "tmpmail.org", "tmpmail.net", "tmail.ws", "dropmail.me", "33mail.com", "spam4.me", "mailtemp.net", "minuteinbox.com", "tempmailaddress.com",
  "internxt.email", "byom.de", "trbvm.com", "armyspy.com", "cuvox.de", "dayrep.com", "einrot.com", "fleckens.hu", "gustr.com", "jourrapide.com",
  "rhyta.com", "superrito.com", "teleworm.us", "mail.tm", "mailto.plus", "fexpost.com", "fexbox.org", "rover.info", "chitthi.in",
]);

/** Names nobody owns: placeholders people type to get past a form. */
const MADE_UP = new Set(["example.com", "example.org", "example.net", "test.com", "test.test", "mail.test", "localhost.com", "asdf.com", "abc.com", "none.com", "no.com", "fake.com", "123.com"]);

/** The mail services most people use, for catching "gmial.com". */
const WELL_KNOWN = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "live.com", "proton.me", "protonmail.com", "aol.com", "ymail.com", "msn.com"];

/** How many single-letter edits (or swaps of neighbours) turn one word into the other. */
function distance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
    }
  }
  return rows[a.length][b.length];
}

/** Real services whose names happen to sit one letter from a bigger one. */
const NOT_A_SLIP = new Set(["mail.com", "email.com", "gmx.com", "me.com", "mac.com", "live.co.uk", "yahoo.co", "pm.me"]);

/** `suggestion` is the address we think was meant; it is only ever a hint, never a refusal. */
export type EmailCheck = { ok: true; suggestion?: string } | { ok: false; problem: string };

/** Everything that can be told from the address alone. (Whether the domain takes mail at all is checked on the server.) */
export function checkEmail(input: string): EmailCheck {
  const email = input.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(email) || email.includes("..")) return { ok: false, problem: "That doesn't look like an email address." };
  const [name, domain] = [email.slice(0, email.lastIndexOf("@")), email.slice(email.lastIndexOf("@") + 1)];
  if (DISPOSABLE.has(domain) || [...DISPOSABLE].some((d) => domain.endsWith(`.${d}`))) return { ok: false, problem: "Temporary email addresses can't be used. Please use your real one." };
  if (MADE_UP.has(domain)) return { ok: false, problem: "That isn't a real email address. Please use your own." };
  if (!WELL_KNOWN.includes(domain) && !NOT_A_SLIP.has(domain)) {
    const near = WELL_KNOWN.find((known) => distance(domain, known) === 1);
    if (near) return { ok: true, suggestion: `${name}@${near}` };
  }
  return { ok: true };
}
