import "server-only";
import { Pool, types } from "pg";
import { connectionConfig } from "./db-config.mjs";

type Param = string | number | null;

// DATE and TIMESTAMP come back as plain strings ("2026-10-01"), not JS Dates,
// so a habit's log_date can never shift a day through a timezone conversion.
for (const oid of [types.builtins.DATE, types.builtins.TIMESTAMP, types.builtins.TIMESTAMPTZ]) {
  types.setTypeParser(oid, (value) => value);
}

// One pool per process. Stashed on globalThis so dev-mode hot reloads reuse
// it instead of opening a new set of connections on every edit.
const globalForDb = globalThis as unknown as { habitflowPool?: Pool; habitflowReady?: Promise<void> };

function pool(): Pool {
  if (!globalForDb.habitflowPool) {
    globalForDb.habitflowPool = new Pool({
      ...connectionConfig(),
      // Keep this small: every running copy of the app opens its own pool, and
      // free hosted databases allow only ~20 connections in total.
      max: Number(process.env.DB_POOL_SIZE ?? 5),
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
    // an idle connection dropping (database restart, network blip) must not crash the server
    globalForDb.habitflowPool.on("error", () => {});
  }
  return globalForDb.habitflowPool;
}

// Small tables that were added after the first release are created on first
// use, once per process, so a database set up earlier keeps working.
function ready(): Promise<void> {
  globalForDb.habitflowReady ??= (async () => {
    const db = pool();
    await db.query(`CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL UNIQUE,
      icon VARCHAR(10) DEFAULT '📋',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    // Winter Arc: who has opted in to the challenge (and its public leaderboard) each year.
    await db.query(`CREATE TABLE IF NOT EXISTS winter_arc_members (
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      season INT NOT NULL,
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, season)
    )`);
    const { rows } = await db.query("SELECT COUNT(*) AS n FROM categories");
    if (Number(rows[0].n) === 0) {
      await db.query(
        `INSERT INTO categories (name, icon) VALUES ('Health','🧘'), ('Productivity','🎯'), ('Learning','📚'), ('Finance','💰'), ('Social','🤝'), ('Routine','⏰')
         ON CONFLICT (name) DO NOTHING`,
      );
    }
  })().catch((err) => {
    globalForDb.habitflowReady = undefined; // retry on the next request
    throw err;
  });
  return globalForDb.habitflowReady;
}

/** Queries are written with `?` placeholders; Postgres wants $1, $2, … */
function numbered(sql: string): string {
  let n = 0;
  return sql.replace(/\?/g, () => `$${++n}`);
}

/** SELECT → rows. Always parameterised — values are never built into the SQL text. */
export async function query<T = Record<string, unknown>>(sql: string, params: Param[] = []): Promise<T[]> {
  await ready();
  const result = await pool().query(numbered(sql), params);
  return result.rows as T[];
}

export async function queryOne<T = Record<string, unknown>>(sql: string, params: Param[] = []): Promise<T | null> {
  return (await query<T>(sql, params))[0] ?? null;
}

/** INSERT / UPDATE / DELETE → how many rows changed (plus any RETURNING rows). */
export async function execute<T = Record<string, unknown>>(sql: string, params: Param[] = []): Promise<{ rowCount: number; rows: T[] }> {
  await ready();
  const result = await pool().query(numbered(sql), params);
  return { rowCount: result.rowCount ?? 0, rows: result.rows as T[] };
}

/** A UNIQUE constraint was violated (e.g. the username was taken a moment ago). */
export function isDuplicateError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}
