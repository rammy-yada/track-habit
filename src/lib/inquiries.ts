// The two public contact forms. Kept in one place so the form, the server
// check and the admin inbox agree on what the choices are.

export const INQUIRY_KINDS = {
  collab: {
    label: "Collaboration",
    topics: ["Content creator", "Community or club", "College or school", "Gym or coach", "Developer or designer", "Something else"],
    budgets: [] as string[],
  },
  brand: {
    label: "Brand deal",
    topics: ["Sponsor a Winter Arc challenge", "Sponsored habit pack", "Prizes for top finishers", "Blog feature", "Something else"],
    budgets: ["Not sure yet", "Under $100", "$100 – $500", "$500 – $2,000", "More than $2,000"],
  },
} as const;

export type InquiryKind = keyof typeof INQUIRY_KINDS;
export const isInquiryKind = (value: unknown): value is InquiryKind => value === "collab" || value === "brand";
