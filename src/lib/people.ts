// Gender and country choices, and working out an age — shared by the form
// that asks for them, the server that checks them, and the profile that shows them.

export const GENDERS = [
  { value: "male", label: "Male", icon: "♂" },
  { value: "female", label: "Female", icon: "♀" },
  { value: "other", label: "Other", icon: "⚧" },
  { value: "private", label: "Rather not say", icon: "—" },
] as const;
export const isGender = (value: unknown): value is (typeof GENDERS)[number]["value"] => GENDERS.some((g) => g.value === value);
export const genderLabel = (value: string | null) => GENDERS.find((g) => g.value === value)?.label ?? "";

// Every ISO 3166 country code. Names come from the device's own list
// (Intl.DisplayNames), so nothing has to be kept up to date by hand.
const CODES =
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(" ");
const CODE_SET = new Set(CODES);
export const isCountry = (value: unknown): value is string => typeof value === "string" && CODE_SET.has(value);

let names: Intl.DisplayNames | undefined;
export function countryName(code: string | null): string {
  if (!code || !CODE_SET.has(code)) return "";
  try {
    names ??= new Intl.DisplayNames(["en"], { type: "region" });
    return names.of(code) ?? code;
  } catch {
    return code;
  }
}

/** Countries, sorted by name. */
export const countries = () => CODES.map((code) => ({ code, name: countryName(code) })).sort((a, b) => a.name.localeCompare(b.name));

/** "NP" → 🇳🇵 */
export const flag = (code: string | null) => (code && CODE_SET.has(code) ? String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : "");

// a sensible first guess for the country box, from the timezone chosen at sign-up
const ZONE_COUNTRY: Record<string, string> = { "Asia/Kathmandu": "NP", "Asia/Katmandu": "NP", "Asia/Kolkata": "IN", "Asia/Dhaka": "BD", "Asia/Karachi": "PK", "Asia/Dubai": "AE", "Asia/Tokyo": "JP", "Asia/Seoul": "KR", "Asia/Singapore": "SG", "Asia/Bangkok": "TH", "Europe/London": "GB", "Europe/Paris": "FR", "Europe/Berlin": "DE", "Australia/Sydney": "AU", "Pacific/Auckland": "NZ", "America/New_York": "US", "America/Chicago": "US", "America/Denver": "US", "America/Los_Angeles": "US" };
export const guessCountry = (timezone: string) => ZONE_COUNTRY[timezone] ?? "";

export const MIN_AGE = 13;

/** Whole years between a birth date (YYYY-MM-DD) and today (YYYY-MM-DD). */
export function ageOn(birthDate: string, today: string): number {
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}
