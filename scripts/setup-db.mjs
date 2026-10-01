// Creates the tables and seed data. Safe to re-run: it never overwrites
// existing rows.
//
//   npm run db:setup
//   ADMIN_PASSWORD='something' npm run db:setup   (choose the admin password)

import { readFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";
import bcrypt from "bcryptjs";
import { connectionConfig } from "../src/lib/db-config.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const file of [".env.local", ".env"]) {
  const full = path.join(root, file);
  if (existsSync(full)) process.loadEnvFile(full);
}

const config = connectionConfig();
const where = `${config.host}:${config.port}`;

const HINTS = {
  ECONNREFUSED: "Nothing is listening there. For local development, start the database first with: npm run db:local",
  ENOTFOUND: "That host name does not exist — check it for typos.",
  ETIMEDOUT: "No answer from that host — wrong host or port, or it blocks your network.",
  "28P01": "Wrong username or password.",
  "28000": "The server refused this user — if it is a hosted database it needs TLS (sslmode=require / DB_SSL=true).",
  SELF_SIGNED_CERT_IN_CHAIN: "The provider signs with its own certificate authority — set DB_SSL_CA to its CA certificate.",
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: "The provider signs with its own certificate authority — set DB_SSL_CA to its CA certificate.",
};

async function connect() {
  const client = new pg.Client(config);
  client.on("error", () => {});
  try {
    await client.connect();
    return client;
  } catch (err) {
    // The database itself doesn't exist yet (typical on a fresh local server): create it.
    if (err.code === "3D000" && /^\w+$/.test(config.database)) {
      const admin = new pg.Client({ ...config, database: "postgres" });
      await admin.connect();
      await admin.query(`CREATE DATABASE "${config.database}"`);
      await admin.end();
      const retry = new pg.Client(config);
      await retry.connect();
      return retry;
    }
    throw err;
  }
}

let db;
try {
  db = await connect();
} catch (err) {
  console.error(`✗ Could not connect to Postgres at ${where}\n  ${HINTS[err.code] ?? err.message}${HINTS[err.code] ? `\n  (${err.code})` : ""}`);
  process.exit(1);
}

await db.query(readFileSync(path.join(root, "db/schema.sql"), "utf8"));
console.log(`✓ Database '${config.database}' and tables ready`);

const cats = await db.query(
  `INSERT INTO categories (name, icon)
   SELECT * FROM (VALUES ('Health','🧘'), ('Productivity','🎯'), ('Learning','📚'), ('Finance','💰'), ('Social','🤝'), ('Routine','⏰')) AS defaults(name, icon)
   WHERE NOT EXISTS (SELECT 1 FROM categories)`,
);
if (cats.rowCount) console.log("✓ Default categories added");

const { rows } = await db.query("SELECT COUNT(*) AS admins FROM users WHERE role = 'admin'");
if (Number(rows[0].admins) === 0) {
  const password = process.env.ADMIN_PASSWORD || randomBytes(9).toString("base64url");
  await db.query("INSERT INTO users (username, email, password, full_name, role, avatar_color) VALUES ('admin', 'admin@123.com', $1, 'System Administrator', 'admin', '#2563eb')", [
    await bcrypt.hash(password, 12),
  ]);
  console.log(`✓ Admin account created\n    username: admin\n    password: ${password}\n  Change it from Profile after signing in.`);
} else {
  console.log("✓ Admin account already exists — left untouched");
}

await db.end();
