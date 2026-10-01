import { ImageResponse } from "next/og";
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { arcSeason, getArc } from "@/lib/arc";
import { currentUser, type User } from "@/lib/auth";
import { SHARE_HASHTAGS } from "@/lib/constants";
import { todayIn } from "@/lib/dates";
import { queryOne } from "@/lib/db";
import { initial } from "@/lib/text";

export const dynamic = "force-dynamic";

/**
 * GET /api/share-card — the signed-in member's Winter Arc achievement as a
 * picture (1080×1350, the portrait size Instagram and Facebook both like).
 * The numbers are read from the database here, so a shared card can't be faked.
 *
 * GET /api/share-card?kind=quote — the same size, but with the member's own
 * quote, their name and their profile photo.
 */
export async function GET(request: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (request.nextUrl.searchParams.get("kind") === "quote") return quoteCard(user);
  const [arc, photo] = await Promise.all([getArc(user), avatarPng(user.id)]);
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
          <div style={{ display: "flex", alignItems: "center" }}>
            {photo && (
              // eslint-disable-next-line @next/next/no-img-element -- drawn into the generated picture
              <img src={photo} width={72} height={72} alt="" style={{ borderRadius: 36, border: "3px solid #fff", marginRight: 22 }} />
            )}
            <div style={{ display: "flex", fontSize: 34, letterSpacing: 10, color: "#bdbdbd" }}>{name}</div>
          </div>
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

/**
 * The member's profile photo, ready to draw onto a share picture (null: they
 * have none). The stored photo is WebP, which the picture renderer can't
 * read, so it is handed a small black-and-white PNG instead.
 */
async function avatarPng(userId: number): Promise<string | null> {
  const avatar = await queryOne<{ image: Buffer }>("SELECT image FROM avatars WHERE user_id = ?", [userId]);
  return avatar ? `data:image/png;base64,${(await sharp(avatar.image).resize(220, 220).grayscale().png().toBuffer()).toString("base64")}` : null;
}

/** The picture for the Quote tab: the member's own line, signed with their name and photo. */
async function quoteCard(user: User) {
  const season = arcSeason(todayIn(user.timezone));
  const [member, photo] = await Promise.all([queryOne<{ quote: string }>("SELECT quote FROM winter_arc_members WHERE user_id = ? AND season = ?", [user.id, season.year]), avatarPng(user.id)]);
  const quote = member?.quote || "Small steps. Every day. All winter.";
  // longer lines get smaller letters, so the quote always fits
  const size = quote.length > 110 ? 62 : quote.length > 70 ? 76 : quote.length > 40 ? 92 : 112;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "linear-gradient(180deg, #2b2b2b 0%, #0a0a0a 46%, #000 100%)", color: "#fff", padding: 84, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 30, letterSpacing: 12, color: "#bdbdbd" }}>WINTER ARC</div>
          <div style={{ display: "flex", fontSize: 30, letterSpacing: 6, color: "#bdbdbd" }}>{season.live ? `DAY ${season.day} / ${season.totalDays}` : season.range.toUpperCase()}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 220, lineHeight: 0.6, color: "#555", fontWeight: 800 }}>“</div>
          <div style={{ display: "flex", fontSize: size, fontWeight: 700, lineHeight: 1.16, letterSpacing: -1 }}>{quote}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", borderTop: "2px solid #444", paddingTop: 40 }}>
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- drawn into the generated picture
              <img src={photo} width={132} height={132} alt="" style={{ borderRadius: 66, border: "4px solid #fff" }} />
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 132, height: 132, borderRadius: 66, border: "4px solid #fff", background: "#222", fontSize: 64, fontWeight: 800 }}>{initial(user.full_name)}</div>
            )}
            <div style={{ display: "flex", flexDirection: "column", marginLeft: 30 }}>
              <div style={{ display: "flex", fontSize: 46, fontWeight: 800 }}>{user.full_name}</div>
              <div style={{ display: "flex", fontSize: 30, color: "#bdbdbd", marginTop: 4 }}>{`@${user.username}`}</div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 44 }}>
            <div style={{ display: "flex", fontSize: 34, letterSpacing: 4 }}>{SHARE_HASHTAGS.map((tag) => `#${tag}`).join("  ")}</div>
            <div style={{ display: "flex", fontSize: 30, letterSpacing: 8, color: "#bdbdbd" }}>HABITFLOW</div>
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1350, headers: { "Cache-Control": "private, no-store" } },
  );
}
