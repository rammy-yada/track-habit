// Creates an admin account, or resets the password of an existing account and
// makes it an admin. Nothing to edit — it asks:
//
//   npm run admin

import { existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";
import bcrypt from "bcryptjs";
import { connectionConfig } from "../src/lib/db-config.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

let hidden = false;
const output = new Writable({ write: (chunk, _enc, done) => (hidden || process.stdout.write(chunk), done()) });
const lines = createInterface({ input: process.stdin, output, terminal: process.stdin.isTTY })[Symbol.asyncIterator]();
async function ask(question, { secret = false } = {}) {
  process.stdout.write(question);
  hidden = secret;
  const { value } = await lines.next();
  hidden = false;
  if (secret) process.stdout.write("\n");
  return (value ?? "").trim();
}

console.log("\nHabitFlow — admin account\n");

// Which database? The live one if it has been set up, unless you say otherwise.
const liveFile = path.join(root, ".env.live.local");
let live = existsSync(liveFile);
if (live) live = (await ask("Which site? Press Enter for the LIVE site, or type local: ")).toLowerCase() !== "local";
for (const file of live ? [liveFile] : [path.join(root, ".env.local"), path.join(root, ".env")]) if (existsSync(file)) process.loadEnvFile(file);
const config = connectionConfig();
console.log(`Using the ${live ? "LIVE" : "local"} database at ${config.host}.\n`);

const username = (await ask("Username [admin]: ")) || "admin";
if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
  console.error("✗ Usernames are 3-20 characters: letters, numbers and underscore.");
  process.exit(1);
}

const db = new pg.Client(config);
db.on("error", () => {});
try {
  await db.connect();
} catch (err) {
  console.error(`✗ Could not connect to the database (${err.code ?? err.message}).${live ? "" : " Is `npm run db:local` running?"}`);
  process.exit(1);
}

const existing = (await db.query("SELECT id, email, role FROM users WHERE LOWER(username) = LOWER($1)", [username])).rows[0];
let email = existing?.email;
let fullName = "Administrator";
if (existing) {
  console.log(`An account "${username}" already exists (${existing.role}). Its password will be replaced and it will be made an admin.`);
} else {
  email = (await ask("Email for this account: ")).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error("✗ That doesn't look like an email address.");
    process.exit(1);
  }
  fullName = (await ask("Full name [Administrator]: ")) || fullName;
}

let password = await ask("Password, at least 6 characters [press Enter to generate one]: ", { secret: true });
const generated = !password;
if (generated) password = randomBytes(9).toString("base64url");
if (password.length < 6 || password.length > 72) {
  console.error("✗ Passwords are 6-72 characters.");
  process.exit(1);
}
const hash = await bcrypt.hash(password, 12);

try {
  if (existing) await db.query("UPDATE users SET password = $1, role = 'admin', is_active = 1 WHERE id = $2", [hash, existing.id]);
  else await db.query("INSERT INTO users (username, email, password, full_name, role, avatar_color) VALUES ($1, $2, $3, $4, 'admin', '#2563eb')", [username, email, hash, fullName]);
} catch (err) {
  console.error(err.code === "23505" ? "✗ That email is already used by another account." : `✗ ${err.message}`);
  process.exit(1);
}
await db.end();

console.log(`\n✓ ${existing ? "Updated" : "Created"} admin account\n    username: ${username}${generated ? `\n    password: ${password}` : "\n    password: the one you typed"}\n\n  Sign in on the ${live ? "live site" : "local site"}, then open Management in the menu.\n`);
process.exit(0);
