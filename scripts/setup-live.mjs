// Sets up a hosted (live) database by asking a few questions, so there is
// nothing to edit in the command:
//
//   npm run db:setup:live
//
// It creates the tables and the admin account, then saves the settings your
// hosting provider needs to .env.live.local (which git ignores).

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { fileURLToPath } from "node:url";
import os from "node:os";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

// One reader for the whole session. `hidden` stops what you type or paste
// (passwords) from being echoed to the screen.
let hidden = false;
const output = new Writable({
  write(chunk, _encoding, done) {
    if (!hidden) process.stdout.write(chunk);
    done();
  },
});
const reader = createInterface({ input: process.stdin, output, terminal: process.stdin.isTTY });
const lines = reader[Symbol.asyncIterator]();

async function ask(question, { secret = false } = {}) {
  process.stdout.write(question);
  hidden = secret;
  const { value } = await lines.next();
  hidden = false;
  if (secret) process.stdout.write("\n");
  return (value ?? "").trim();
}

console.log("\nHabitFlow — live database setup\n");
console.log("In the Aiven console, open your PostgreSQL service. On the Overview page,");
console.log("copy the “Service URI” (it starts with postgres://).\n");

let uri;
try {
  uri = new URL(await ask("Paste the Service URI (it stays hidden), then press Enter: ", { secret: true }));
  if (uri.protocol === "mysql:") {
    console.error("✗ That is a MySQL address. HabitFlow now uses PostgreSQL — copy the Service URI of a PostgreSQL service instead.");
    process.exit(1);
  }
  if (!["postgres:", "postgresql:"].includes(uri.protocol) || !uri.hostname) throw new Error("not a postgres:// address");
} catch {
  console.error("✗ That doesn't look like a Service URI. It should start with postgres:// — copy it again from Aiven and re-run.");
  process.exit(1);
}

const settings = { DATABASE_URL: uri.href };

// Hosted databases need an encrypted connection. Aiven signs with its own
// certificate authority, so its CA file is needed to trust the connection.
const needsTls = (uri.searchParams.get("sslmode") ?? "require") !== "disable";
if (needsTls) {
  const guess = path.join(os.homedir(), "Downloads", "ca.pem");
  const prompt = existsSync(guess) ? `CA certificate file [press Enter to use ${guess}]: ` : "Path to the CA certificate you downloaded from Aiven (ca.pem): ";
  const caPath = ((await ask(prompt)) || guess).replace(/^~(?=\/)/, os.homedir()).replace(/^['"]|['"]$/g, "");
  if (!existsSync(caPath)) {
    console.error(`✗ No file at ${caPath}. Download “CA certificate” from the Aiven Overview page and re-run.`);
    process.exit(1);
  }
  settings.DB_SSL_CA = readFileSync(caPath, "utf8").trim();
}

const adminPassword = await ask("Choose a password for the admin login [press Enter to generate one]: ", { secret: true });
reader.close();

Object.assign(process.env, settings);
if (adminPassword) process.env.ADMIN_PASSWORD = adminPassword;

// DATABASE_URL takes priority over any local DB_* values in .env.local
console.log(`\nConnecting to ${uri.hostname}…`);
await import("./setup-db.mjs"); // exits with an explanation if it can't connect

// Everything the hosting provider needs, in one file that can be imported.
const live = { ...settings, DB_POOL_SIZE: "3", SESSION_SECRET: randomBytes(32).toString("base64url") };
const file = path.join(root, ".env.live.local");
writeFileSync(
  file,
  "# Settings for the LIVE site. Add these to your hosting provider's environment\n# variables (most providers can import this file). Never commit it.\n" +
    Object.entries(live)
      .map(([key, value]) => `${key}="${value.replace(/\n/g, "\\n")}"`)
      .join("\n") +
    "\n",
  { mode: 0o600 },
);

console.log(`
✓ Live database is ready.

Next:
  1. Add the settings saved in .env.live.local to your hosting provider's
     environment variables (it contains your database password — keep it private).
  2. Redeploy the site.
  3. Open your site's address followed by /api/health — it should say "status":"ok".
`);
