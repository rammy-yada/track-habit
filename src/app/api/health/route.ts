import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";
import { safeEqual } from "@/lib/safe-equal";
import { queryOne } from "@/lib/db";
import { connectionConfig } from "@/lib/db-config.mjs";

export const dynamic = "force-dynamic";

// GET /api/health — is this instance able to serve requests?
//
// Used two ways: a load balancer polls it to decide whether to send traffic
// here (200 = yes, 503 = no), and a person can open it to see *which* part of
// the setup is broken. It reports short codes only — never hosts, usernames,
// passwords or secrets.
export async function GET(request: NextRequest) {
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
  // Anyone may know whether the site is up (a load balancer has to). *Why* it
  // is down — which setting is wrong — is told only to an administrator, or
  // to a caller holding the scheduler's secret.
  const cronSecret = process.env.CRON_SECRET ?? "";
  const bearer = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const trusted = (cronSecret.length >= 16 && safeEqual(bearer, cronSecret)) || (database === "ok" && (await currentUser().catch(() => null))?.role === "admin");
  if (!trusted) return NextResponse.json({ status: healthy ? "ok" : "error", ...(healthy ? { session, database } : {}), time: new Date().toISOString() }, { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json(
    { status: healthy ? "ok" : "error", session, database, tls: connectionConfig().ssl ? "on" : "off", time: new Date().toISOString() },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}

const DB_HINTS: Record<string, string> = {
  ECONNREFUSED: "nothing is listening at the database address (is DATABASE_URL set on this host?)",
  ENOTFOUND: "the database host does not resolve — check it for typos",
  ETIMEDOUT: "the database host did not answer — wrong host/port, or it blocks this server's IP",
  "28P01": "wrong database username or password",
  "28000": "the database refused this user — hosted databases need TLS: add ?sslmode=require to DATABASE_URL",
  "3D000": "that database does not exist — check the name at the end of DATABASE_URL",
  "42P01": "tables are missing — run `npm run db:setup:live` against this database",
  "53300": "the database is out of connections — lower DB_POOL_SIZE",
  SELF_SIGNED_CERT_IN_CHAIN: "the provider uses its own CA — set DB_SSL_CA to its CA certificate",
  DEPTH_ZERO_SELF_SIGNED_CERT: "the provider uses its own CA — set DB_SSL_CA to its CA certificate",
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: "the provider uses its own CA — set DB_SSL_CA to its CA certificate",
  ECONNRESET: "the connection was reset — usually TLS is required: add ?sslmode=require to DATABASE_URL",
};
