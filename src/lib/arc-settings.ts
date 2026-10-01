import "server-only";
import { execute, query } from "./db";
import { DEFAULT_SURPRISES, normalizeIntro, normalizeSurprises, type IntroConfig } from "./arc-config";

export type ArcIntroSetup = IntroConfig & {
  /** Address of the admin's own sound, if one has been uploaded. */
  soundUrl: string | null;
};

type Stored = { intro?: unknown; surprises?: unknown };

/** Everything an admin has configured for the Winter Arc, with defaults filled in. */
export async function getArcSettings(): Promise<{ intro: ArcIntroSetup; surprises: string[]; customSurprises: string[] }> {
  const [settings, sound] = await Promise.all([query<{ value: string }>("SELECT value FROM site_settings WHERE key = 'arc'"), query<{ version: number }>("SELECT version FROM site_images WHERE slot = 'sound'")]);
  let stored: Stored = {};
  try {
    stored = settings[0] ? (JSON.parse(settings[0].value) as Stored) : {};
  } catch {}
  const custom = normalizeSurprises(stored.surprises);
  return {
    intro: { ...normalizeIntro(stored.intro), soundUrl: sound[0] ? `/api/intro-image/sound?v=${sound[0].version}` : null },
    surprises: custom.length ? custom : DEFAULT_SURPRISES,
    customSurprises: custom,
  };
}

export async function saveArcSettings(intro: unknown, surprises: unknown): Promise<void> {
  const value = JSON.stringify({ intro: normalizeIntro(intro), surprises: normalizeSurprises(surprises) });
  await execute("INSERT INTO site_settings (key, value) VALUES ('arc', ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()", [value]);
}
