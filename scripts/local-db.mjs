// A local Postgres for development, with nothing to install:
//
//   npm run db:local        (leave it running; Ctrl+C stops it)
//
// The data lives in .pgdata/ in this folder and survives restarts.

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = process.env.LOCAL_DB_DIR ?? path.join(root, ".pgdata");
const port = Number(process.env.DB_PORT ?? 5432);

const server = new EmbeddedPostgres({ databaseDir: dataDir, user: "postgres", password: "postgres", port, persistent: true, onLog: () => {}, onError: () => {} });

if (!existsSync(path.join(dataDir, "PG_VERSION"))) {
  console.log("First run: creating the local database files…");
  await server.initialise();
}
try {
  await server.start();
} catch {
  console.error(`✗ Could not start Postgres on port ${port} — is another copy (or another Postgres) already running?`);
  process.exit(1);
}
try {
  await server.createDatabase("habitflow");
} catch {
  // already exists
}

console.log(`✓ Postgres is running on 127.0.0.1:${port} (user: postgres, password: postgres, database: habitflow)`);
console.log("  In another terminal:  npm run db:setup   (first time only), then  npm run dev");
console.log("  Press Ctrl+C here to stop the database.");

let stopping = false;
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    if (stopping) return;
    stopping = true;
    await server.stop();
    process.exit(0);
  });
}
setInterval(() => {}, 1 << 30); // keep the process alive
