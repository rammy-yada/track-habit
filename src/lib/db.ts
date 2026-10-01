import "server-only";
import { Pool, types } from "pg";
import { connectionConfig } from "./db-config.mjs";

type Param = string | number | null | Buffer;

// DATE and TIMESTAMP come back as plain strings ("2026-10-01"), not JS Dates,
// so a habit's log_date can never shift a day through a timezone conversion.
for (const oid of [types.builtins.DATE, types.builtins.TIMESTAMP, types.builtins.TIMESTAMPTZ]) {
  types.setTypeParser(oid, (value) => value);
}

// One pool per running copy of the app, stashed on globalThis so dev-mode hot
// reloads reuse it.
//
// It is deliberately tiny. On a serverless host every warm instance has its
// own pool, and a free hosted database allows only ~15 connections in total —
// so each instance takes at most two, and gives them back after a few idle
// seconds.
const globalForDb = globalThis as unknown as { habitflowPool?: Pool; habitflowMigrated?: Promise<void> };

function pool(): Pool {
  if (!globalForDb.habitflowPool) {
    globalForDb.habitflowPool = new Pool({
      ...connectionConfig(),
      max: Number(process.env.DB_POOL_SIZE ?? 2),
      idleTimeoutMillis: 5_000,
      connectionTimeoutMillis: 8_000,
      allowExitOnIdle: true,
    });
    // an idle connection dropping (database restart, network blip) must not crash the server
    globalForDb.habitflowPool.on("error", () => {});
  }
  return globalForDb.habitflowPool;
}

// Tables and columns added after the first release. `npm run db:setup` creates
// them too; this brings a database that was set up earlier up to date.
// Once per running copy of the app, one cheap query checks whether the newest
// addition exists; only if it doesn't are the upgrades applied (one round trip).
const UPGRADES = `
  CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY, name VARCHAR(50) NOT NULL UNIQUE, icon VARCHAR(10) DEFAULT '📋', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS winter_arc_members (
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, season INT NOT NULL, joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, season)
  );
  ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(64);
  CREATE UNIQUE INDEX IF NOT EXISTS users_google_id ON users (google_id);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_version INT NOT NULL DEFAULT 0;
  CREATE TABLE IF NOT EXISTS avatars (
    user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, image BYTEA NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  INSERT INTO categories (name, icon)
    SELECT * FROM (VALUES ('Health','🧘'), ('Productivity','🎯'), ('Learning','📚'), ('Finance','💰'), ('Social','🤝'), ('Routine','⏰')) AS d(name, icon)
    WHERE NOT EXISTS (SELECT 1 FROM categories);
`;

function upToDate(): Promise<void> {
  globalForDb.habitflowMigrated ??= (async () => {
    const check = await pool().query("SELECT to_regclass('public.avatars') IS NOT NULL AS ok"); // the newest addition
    if (!check.rows[0].ok) await pool().query(UPGRADES);
  })().catch((err) => {
    globalForDb.habitflowMigrated = undefined; // try again on the next request
    throw err;
  });
  return globalForDb.habitflowMigrated;
}

// Couldn't even get a connection (database busy or out of connections): worth
// one more try. Only failures from *before* the query ran are retried, so a
// write can never be applied twice.
const BUSY = new Set(["53300", "57P03", "08001", "ECONNREFUSED"]);
const isBusy = (err: { code?: string; message?: string }) => BUSY.has(err.code ?? "") || /timeout exceeded when trying to connect/i.test(err.message ?? "");

/** Queries are written with `?` placeholders; Postgres wants $1, $2, … */
function numbered(sql: string): string {
  let n = 0;
  return sql.replace(/\?/g, () => `$${++n}`);
}

async function run(sql: string, params: Param[]) {
  const text = numbered(sql);
  try {
    await upToDate();
    return await pool().query(text, params);
  } catch (first) {
    const err = first as { code?: string; message?: string };
    if (isBusy(err)) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      return pool().query(text, params);
    }
    throw first;
  }
}

/** SELECT → rows. Always parameterised — values are never built into the SQL text. */
export async function query<T = Record<string, unknown>>(sql: string, params: Param[] = []): Promise<T[]> {
  return (await run(sql, params)).rows as T[];
}

export async function queryOne<T = Record<string, unknown>>(sql: string, params: Param[] = []): Promise<T | null> {
  return (await query<T>(sql, params))[0] ?? null;
}

/** INSERT / UPDATE / DELETE → how many rows changed (plus any RETURNING rows). */
export async function execute<T = Record<string, unknown>>(sql: string, params: Param[] = []): Promise<{ rowCount: number; rows: T[] }> {
  const result = await run(sql, params);
  return { rowCount: result.rowCount ?? 0, rows: result.rows as T[] };
}

/** A UNIQUE constraint was violated (e.g. the username was taken a moment ago). */
export function isDuplicateError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}
