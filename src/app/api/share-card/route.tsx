import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { getArc } from "@/lib/arc";
import { currentUser } from "@/lib/auth";
import { SHARE_HASHTAGS } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * GET /api/share-card — the signed-in member's Winter Arc achievement as a
 * picture (1080×1350, the portrait size Instagram and Facebook both like).
 * The numbers are read from the database here, so a shared card can't be faked.
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const arc = await getArc(user);
  const me = arc.me;
  const name = user.full_name.split(" ")[0].toUpperCase();
  const stats = me
    ? [
        { label: "POINTS", value: me.points.toLocaleString("en-US") },
        { label: "DAY STREAK", value: String(me.streak) },
        { label: "RANK", value: `#${me.rank}` },
      ]
    : [];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "linear-gradient(180deg, #2b2b2b 0%, #0a0a0a 46%, #000 100%)", color: "#fff", padding: 84, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 30, letterSpacing: 12, color: "#bdbdbd" }}>{arc.season.range.toUpperCase()}</div>
          <div style={{ fontSize: 150, fontWeight: 200, letterSpacing: 6, lineHeight: 1, marginTop: 26 }}>WINTER</div>
          <div style={{ fontSize: 150, fontWeight: 200, letterSpacing: 6, lineHeight: 1 }}>ARC</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 34, letterSpacing: 10, color: "#bdbdbd" }}>{name}</div>
          <div style={{ display: "flex", alignItems: "baseline", marginTop: 8 }}>
            <div style={{ fontSize: 250, fontWeight: 800, lineHeight: 1 }}>{arc.season.live ? `DAY ${arc.season.day}` : "DAY 0"}</div>
            <div style={{ fontSize: 60, color: "#8a8a8a", marginLeft: 24 }}>{`/ ${arc.season.totalDays}`}</div>
          </div>
          {/* how far through the season */}
          <div style={{ display: "flex", height: 6, background: "#333", marginTop: 30 }}>
            <div style={{ width: `${Math.max(2, (arc.season.day / arc.season.totalDays) * 100)}%`, background: "#fff" }} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {stats.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "2px solid #444", borderBottom: "2px solid #444", padding: "38px 0" }}>
              {stats.map((s) => (
                <div key={s.label} style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ fontSize: 92, fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 26, letterSpacing: 8, color: "#bdbdbd", marginTop: 12 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 44 }}>
            <div style={{ fontSize: 34, letterSpacing: 4 }}>{SHARE_HASHTAGS.map((tag) => `#${tag}`).join("  ")}</div>
            <div style={{ fontSize: 30, letterSpacing: 8, color: "#bdbdbd" }}>HABITFLOW</div>
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1350, headers: { "Cache-Control": "private, no-store" } },
  );
}
