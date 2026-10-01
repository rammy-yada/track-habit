import "server-only";
import mysql, { type Pool, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

type Param = string | number | null;

// One pool per process. Stashed on globalThis so dev-mode hot reloads reuse
// it instead of opening a new set of connections on every edit.
const globalForDb = globalThis as unknown as { habitflowPool?: Pool; habitflowReady?: Promise<void> };

// Hosted databases (Aiven, TiDB Cloud, …) only accept encrypted connections.
// DB_SSL=true turns TLS on; DB_SSL_CA is the provider's CA certificate (PEM
// text) for providers that sign with their own CA rather than a public one.
function sslOptions() {
  if (process.env.DB_SSL !== "true") return undefined;
  const ca = process.env.DB_SSL_CA?.replace(/\\n/g, "\n");
  return { minVersion: "TLSv1.2" as const, rejectUnauthorized: true, ...(ca ? { ca } : {}) };
}

function pool(): Pool {
  globalForDb.habitflowPool ??= mysql.createPool({
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASS ?? "",
    database: process.env.DB_NAME ?? "habitflow",
    ssl: sslOptions(),
    charset: "utf8mb4",
    // Keep this small on serverless hosts: every running instance opens its own pool.
    connectionLimit: Number(process.env.DB_POOL_SIZE ?? 10),
    // DATE/TIMESTAMP come back as plain strings ("2026-10-01"), so a habit's
    // log_date can never shift a day through a JS Date timezone conversion.
    dateStrings: true,
  });
  return globalForDb.habitflowPool;
}

// The PHP app created the categories table lazily on first visit to the admin
// page. Same idea here, once per process, so an older database that never saw
// that page still works.
function ready(): Promise<void> {
  globalForDb.habitflowReady ??= (async () => {
    const db = pool();
    await db.query(`CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) NOT NULL UNIQUE,
      icon VARCHAR(10) DEFAULT '📋',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    // Winter Arc: who has opted in to the challenge (and its public leaderboard) each year.
    await db.query(`CREATE TABLE IF NOT EXISTS winter_arc_members (
      user_id INT NOT NULL,
      season INT NOT NULL,
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, season),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
    const [rows] = await db.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM categories");
    if (Number(rows[0].n) === 0) {
      const defaults = [["Health", "🧘"], ["Productivity", "🎯"], ["Learning", "📚"], ["Finance", "💰"], ["Social", "🤝"], ["Routine", "⏰"]];
      await db.query("INSERT IGNORE INTO categories (name, icon) VALUES ?", [defaults]);
    }
  })().catch((err) => {
    globalForDb.habitflowReady = undefined; // retry on the next request
    throw err;
  });
  return globalForDb.habitflowReady;
}

/** SELECT → rows. Always parameterised (prepared statement), never string-built. */
export async function query<T = Record<string, unknown>>(sql: string, params: Param[] = []): Promise<T[]> {
  await ready();
  const [rows] = await pool().execute<RowDataPacket[]>(sql, params);
  return rows as T[];
}

export async function queryOne<T = Record<string, unknown>>(sql: string, params: Param[] = []): Promise<T | null> {
  return (await query<T>(sql, params))[0] ?? null;
}

/** INSERT / UPDATE / DELETE → { insertId, affectedRows }. */
export async function execute(sql: string, params: Param[] = []): Promise<ResultSetHeader> {
  await ready();
  const [result] = await pool().execute<ResultSetHeader>(sql, params);
  return result;
}

export function isDuplicateError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "ER_DUP_ENTRY";
}
