// Creates the database, tables and seed data. Safe to re-run: it never
// overwrites existing rows, so an existing PHP-era database is left as is.
//
//   npm run db:setup
//   ADMIN_PASSWORD='something' npm run db:setup   (choose the admin password)

import { readFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const file of [".env.local", ".env"]) {
  const full = path.join(root, file);
  if (existsSync(full)) process.loadEnvFile(full);
}

const { DB_HOST = "127.0.0.1", DB_PORT = "3306", DB_USER = "root", DB_PASS = "", DB_NAME = "habitflow", DB_SSL, DB_SSL_CA } = process.env;
const ca = DB_SSL_CA?.replace(/\\n/g, "\n");
const ssl = DB_SSL === "true" ? { minVersion: "TLSv1.2", rejectUnauthorized: true, ...(ca ? { ca } : {}) } : undefined;
if (!/^\w+$/.test(DB_NAME)) throw new Error(`Unsafe DB_NAME: ${DB_NAME}`);

let db;
try {
  db = await mysql.createConnection({ host: DB_HOST, port: Number(DB_PORT), user: DB_USER, password: DB_PASS, ssl, multipleStatements: true });
} catch (err) {
  console.error(`✗ Could not connect to MySQL at ${DB_HOST}:${DB_PORT} — is it running, and are the DB_* settings right?\n  ${err.message}`);
  process.exit(1);
}

await db.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
await db.query(`USE \`${DB_NAME}\``);
await db.query(readFileSync(path.join(root, "db/schema.sql"), "utf8"));
console.log(`✓ Database '${DB_NAME}' and tables ready`);

const [[{ cats }]] = await db.query("SELECT COUNT(*) AS cats FROM categories");
if (cats === 0) {
  const defaults = [["Health", "🧘"], ["Productivity", "🎯"], ["Learning", "📚"], ["Finance", "💰"], ["Social", "🤝"], ["Routine", "⏰"]];
  await db.query("INSERT INTO categories (name, icon) VALUES ?", [defaults]);
  console.log("✓ Default categories added");
}

const [[{ admins }]] = await db.query("SELECT COUNT(*) AS admins FROM users WHERE role = 'admin'");
if (admins === 0) {
  const password = process.env.ADMIN_PASSWORD || randomBytes(9).toString("base64url");
  await db.query(
    "INSERT INTO users (username, email, password, full_name, role, avatar_color) VALUES ('admin', 'admin@123.com', ?, 'System Administrator', 'admin', '#2563eb')",
    [await bcrypt.hash(password, 12)],
  );
  console.log(`✓ Admin account created\n    username: admin\n    password: ${password}\n  Change it from Profile after signing in.`);
} else {
  console.log("✓ Admin account already exists — left untouched");
}

await db.end();
