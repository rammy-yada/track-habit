import type { Metadata } from "next";
import { ArcGoals } from "@/components/arc/ArcGoals";
import { ArcHub } from "@/components/arc/ArcHub";
import { ArcIntro } from "@/components/arc/ArcIntro";
import { ArcPackPanel } from "@/components/arc/ArcPackPanel";
import { ArcQuote } from "@/components/arc/ArcQuote";
import { ArcScreen } from "@/components/arc/ArcScreen";
import { ArcStory, type Story } from "@/components/arc/ArcStory";
import { ArcTips } from "@/components/arc/ArcTips";
import { WorkoutPicker } from "@/components/arc/WorkoutPicker";
import { getArc } from "@/lib/arc";
import { MILESTONES } from "@/lib/arc-config";
import { getArcPanel } from "@/lib/arc-packs";
import { getArcSettings } from "@/lib/arc-settings";
import { requireUser } from "@/lib/auth";
import { diffDays, formatDate, todayIn } from "@/lib/dates";
import { query, queryOne } from "@/lib/db";
import { getIntroImages } from "@/lib/intro";
import { emailLang } from "@/lib/mail";
import { quoteFor } from "@/lib/quotes";
import { decodeEntities } from "@/lib/text";

export const metadata: Metadata = { title: "Winter Arc" };

// The Winter Arc has a screen to itself: it covers the app's own menu, opens
// with the story, and has four sections — Goals, Tips, Quote, Leaderboard.
export default async function ArcPage() {
  const user = await requireUser();
  const today = todayIn(user.timezone);
  const [arc, habits, images] = await Promise.all([getArc(user), query<{ name: string }>("SELECT name FROM habits WHERE user_id = ? AND is_active = 1", [user.id]), getIntroImages()]);
  const { season } = arc;
  const member = arc.me !== null;
  // members only: their pack, goals and quote, and the intro as the admin has set it up
  const [panel, settings, goals, mine] = member
    ? await Promise.all([
        getArcPanel(user),
        getArcSettings(),
        query<{ id: number; text: string; done: number }>("SELECT id, text, done FROM arc_goals WHERE user_id = ? AND season = ? ORDER BY id", [user.id, season.year]),
        queryOne<{ quote: string }>("SELECT quote FROM winter_arc_members WHERE user_id = ? AND season = ?", [user.id, season.year]),
      ])
    : [null, null, [], null];

  const perfectDays = panel?.perfectDays ?? 0;
  const next = MILESTONES.find((m) => m.days > perfectDays);
  const story: Story = {
    member,
    firstName: user.full_name.split(" ")[0],
    season: { range: season.range, day: season.day, totalDays: season.totalDays, live: season.live, startsIn: season.startsIn },
    members: arc.members,
    top: arc.board.slice(0, 3).map((entry) => ({ name: entry.name, points: entry.points, isMe: entry.isMe })),
    me: arc.me && { rank: arc.me.rank, points: arc.me.points, streak: arc.me.streak, today: arc.me.today, dailyMax: arc.me.dailyMax },
    pack: panel?.pack ? { name: panel.pack.name, icon: panel.pack.icon, habits: panel.habits.map((h) => ({ name: h.name, icon: h.icon, done: h.doneToday })) } : null,
    perfectDays,
    nextBadge: next ? { title: next.title, inDays: next.days - perfectDays } : null,
    quote: quoteFor(emailLang(user), today),
  };

  return (
    <>
      {/* the first time, the opening scene; every time after, the story */}
      {member && settings && <ArcIntro firstName={story.firstName} images={images} totalDays={season.totalDays} config={settings.intro} />}
      <ArcStory story={story} />
      <ArcHub
        member={member}
        status={season.live ? `Day ${season.day} of ${season.totalDays} · ${season.range}` : `Starts in ${season.startsIn} days · ${season.range}`}
        goals={
          <div className="space-y-5">
            <ArcGoals member={member} goals={goals.map((g) => ({ id: g.id, text: g.text, done: g.done === 1 }))} endsOn={formatDate(season.end, { month: "long", day: "numeric" })} />
            {panel && <ArcPackPanel panel={panel} />}
          </div>
        }
        tips={
          <div className="space-y-8">
            <ArcTips dayNumber={season.live ? season.day - 1 : diffDays("2026-01-01", today)} />
            <WorkoutPicker existing={habits.map((h) => decodeEntities(h.name))} />
          </div>
        }
        quote={<ArcQuote member={member} saved={mine?.quote ?? ""} day={season.day} totalDays={season.totalDays} live={season.live} photoVersion={user.avatar_version} />}
        leaderboard={<ArcScreen arc={arc} />}
      />
    </>
  );
}
