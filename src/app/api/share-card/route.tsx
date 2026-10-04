import { ImageResponse } from "next/og";
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { arcSeason, getArc } from "@/lib/arc";
import { currentUser, type User } from "@/lib/auth";
import { SHARE_HASHTAGS } from "@/lib/constants";
import { todayIn } from "@/lib/dates";
import { queryOne } from "@/lib/db";
import { initial } from "@/lib/text";
import { overLimit } from "@/lib/throttle";

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
  // drawing a picture is the most expensive thing the server does for one request
  if (await overLimit(`card:${user.id}`, 60, 60)) return NextResponse.json({ error: "Too many requests. Please wait a while and try again." }, { status: 429 });
  if (request.nextUrl.searchParams.get("kind") === "quote") return quoteCard(user);
  const [arc, photo] = await Promise.all([getArc(user), avatarPng(user.id)]);
  const me = arc.me;
  const { season } = arc;
  const progress = season.live ? season.day / season.totalDays : 0;
  const stats = me
    ? [
        { label: "POINTS", value: me.points.toLocaleString("en-US") },
        { label: "DAY STREAK", value: String(me.streak) },
        { label: "RANK", value: `#${me.rank}` },
      ]
    : [];
  // the season as a row of ticks: filled up to today
  const ticks = Array.from({ length: 41 }, (_, i) => i / 40 <= progress);
  const line = !me ? "I'm in." : me.streak >= 7 ? `${me.streak} days without missing one.` : me.rank <= 3 ? "On the podium. Staying there." : "Showing up. Every day.";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "radial-gradient(circle at 50% 22%, #4a4a4a 0%, #1a1a1a 32%, #050505 62%)", color: "#fff", fontFamily: "sans-serif" }}>
        {/* the top: a soft light behind the person */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "70px 84px 0" }}>
          <div style={{ display: "flex", width: "100%", justifyContent: "space-between", fontSize: 28, letterSpacing: 10, color: "#bdbdbd" }}>
            <div style={{ display: "flex" }}>WINTER ARC</div>
            <div style={{ display: "flex" }}>{season.range.toUpperCase()}</div>
          </div>
          <div style={{ display: "flex", marginTop: 64, padding: 8, borderRadius: 130, border: "4px solid #fff" }}>
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- drawn into the generated picture
              <img src={photo} width={220} height={220} alt="" style={{ borderRadius: 110 }} />
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 220, height: 220, borderRadius: 110, background: "#222", fontSize: 110, fontWeight: 800 }}>{initial(user.full_name)}</div>
            )}
          </div>
          <div style={{ display: "flex", marginTop: 26, fontSize: 52, fontWeight: 800 }}>{user.full_name}</div>
          <div style={{ display: "flex", marginTop: 2, fontSize: 30, color: "#a3a3a3" }}>{`@${user.username}`}</div>
        </div>

        {/* the middle: the day */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "34px 84px 0" }}>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <div style={{ display: "flex", fontSize: 54, letterSpacing: 14, color: "#bdbdbd", marginRight: 22 }}>DAY</div>
            <div style={{ display: "flex", fontSize: 230, fontWeight: 800, lineHeight: 1 }}>{String(season.live ? season.day : 0)}</div>
            <div style={{ display: "flex", fontSize: 54, color: "#7a7a7a", marginLeft: 18 }}>{`/ ${season.totalDays}`}</div>
          </div>
          <div style={{ display: "flex", width: "100%", justifyContent: "space-between", marginTop: 18 }}>
            {ticks.map((on, i) => (
              <div key={i} style={{ display: "flex", width: 12, height: on ? 34 : 22, marginTop: on ? 0 : 12, borderRadius: 6, background: on ? "#fff" : "#333" }} />
            ))}
          </div>
          <div style={{ display: "flex", marginTop: 30, fontSize: 38, fontStyle: "italic", color: "#d4d4d4" }}>{line}</div>
        </div>

        {/* the bottom: the numbers */}
        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "flex-end", padding: "0 84px 70px" }}>
          {stats.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              {stats.map((stat) => (
                <div key={stat.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 286, padding: "30px 0", borderRadius: 28, border: "2px solid #3a3a3a", background: "#111" }}>
                  <div style={{ display: "flex", fontSize: 78, fontWeight: 800, lineHeight: 1 }}>{stat.value}</div>
                  <div style={{ display: "flex", fontSize: 22, letterSpacing: 6, color: "#a3a3a3", marginTop: 12 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          )}
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
