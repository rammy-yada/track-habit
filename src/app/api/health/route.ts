import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/health — is this instance able to serve requests?
//
// Used two ways: a load balancer polls it to decide whether to send traffic
// here (200 = yes, 503 = no), and a person can open it to see *which* part of
// the setup is broken. It reports short codes only — never hosts, usernames,
// passwords or secrets.
export async function GET() {
  const secret = process.env.SESSION_SECRET ?? "";
  const session = secret.length >= 32 ? "ok" : secret ? "SESSION_SECRET is shorter than 32 characters" : "SESSION_SECRET is not set";

  let database = "ok";
  try {
    await queryOne("SELECT 1 AS up");
  } catch (err) {
    const code = (err as { code?: string }).code ?? "UNKNOWN";
    database = `${code}: ${DB_HINTS[code] ?? "the database rejected or dropped the connection"}`;
  }

  const healthy = session === "ok" && database === "ok";
  return NextResponse.json(
    { status: healthy ? "ok" : "error", session, database, tls: process.env.DB_SSL === "true" ? "on" : "off", time: new Date().toISOString() },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}

const DB_HINTS: Record<string, string> = {
  ECONNREFUSED: "nothing is listening at DB_HOST:DB_PORT (are the DB_* variables set on this host?)",
  ENOTFOUND: "DB_HOST does not resolve — check for typos",
  ETIMEDOUT: "DB_HOST did not answer — wrong host/port, or the database blocks this server's IP",
  ER_ACCESS_DENIED_ERROR: "wrong DB_USER or DB_PASS",
  ER_DBACCESS_DENIED_ERROR: "this user may not open DB_NAME",
  ER_BAD_DB_ERROR: "DB_NAME does not exist — run `npm run db:setup` against this database",
  ER_NO_SUCH_TABLE: "tables are missing — run `npm run db:setup` against this database",
  HANDSHAKE_NO_SSL_SUPPORT: "the database does not offer TLS — remove DB_SSL",
  HANDSHAKE_SSL_ERROR: "TLS failed — set DB_SSL_CA to the provider's CA certificate",
  SELF_SIGNED_CERT_IN_CHAIN: "the provider uses its own CA — set DB_SSL_CA to its CA certificate",
  DEPTH_ZERO_SELF_SIGNED_CERT: "the provider uses its own CA — set DB_SSL_CA to its CA certificate",
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: "the provider uses its own CA — set DB_SSL_CA to its CA certificate",
  ER_SECURE_TRANSPORT_REQUIRED: "this database requires TLS — set DB_SSL=true",
  PROTOCOL_CONNECTION_LOST: "the connection was closed — usually TLS is required: set DB_SSL=true",
  ECONNRESET: "the connection was reset — usually TLS is required: set DB_SSL=true",
};
