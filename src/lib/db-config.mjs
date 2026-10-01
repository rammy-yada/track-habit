// Works out how to connect to Postgres from environment variables. Shared by
// the app (src/lib/db.ts) and the setup scripts, so they can never disagree.
//
// Either set DATABASE_URL (what hosting providers give you):
//   postgres://user:password@host:port/database?sslmode=require
// or the individual DB_HOST / DB_PORT / DB_USER / DB_PASS / DB_NAME values.

/** @param {NodeJS.ProcessEnv} env */
export function connectionConfig(rawEnv = process.env) {
  // Some dashboards keep the quotes when a .env file is pasted in; drop them.
  const env = Object.fromEntries(Object.entries(rawEnv).map(([key, value]) => [key, value?.trim().replace(/^(["'])(.*)\1$/s, "$2")]));
  let host = env.DB_HOST ?? "127.0.0.1";
  let port = Number(env.DB_PORT ?? 5432);
  let user = env.DB_USER ?? "postgres";
  let password = env.DB_PASS ?? "";
  let database = env.DB_NAME ?? "habitflow";
  let tls = env.DB_SSL === "true";

  if (env.DATABASE_URL) {
    const url = new URL(env.DATABASE_URL);
    host = url.hostname;
    port = Number(url.port || 5432);
    user = decodeURIComponent(url.username);
    password = decodeURIComponent(url.password);
    database = decodeURIComponent(url.pathname.replace(/^\//, "")) || "postgres";
    const mode = url.searchParams.get("sslmode");
    if (mode && mode !== "disable") tls = true;
    if (env.DB_SSL === "false") tls = false;
  }

  // The certificate is always verified. DB_SSL_CA is the provider's CA
  // certificate (PEM text), needed when they sign with their own authority
  // (Aiven does) instead of a public one.
  const ca = env.DB_SSL_CA?.replace(/\\n/g, "\n");
  const ssl = tls ? { minVersion: "TLSv1.2", rejectUnauthorized: true, ...(ca ? { ca } : {}) } : undefined;

  // Timestamps are stored and compared in UTC on every connection.
  return { host, port, user, password, database, ssl, options: "-c timezone=UTC" };
}
