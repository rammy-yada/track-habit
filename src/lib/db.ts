import "server-only";
import mysql, { type Pool, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

type Param = string | number | null;

// One pool per process. Stashed on globalThis so dev-mode hot reloads reuse
// it instead of opening a new set of connections on every edit.
const globalForDb = globalThis as unknown as { habitflowPool?: Pool; habitflowReady?: Promise<void> };

function pool(): Pool {
  globalForDb.habitflowPool ??= mysql.createPool({
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASS ?? "",
    database: process.env.DB_NAME ?? "habitflow",
    charset: "utf8mb4",
    connectionLimit: 10,
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
