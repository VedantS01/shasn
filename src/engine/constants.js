export const IDEOLOGIES = ["capitalist", "supremo", "showman", "idealist"];
export const RESOURCES = ["funds", "clout", "media", "trust"];

export const RESOURCE_OF = { capitalist: "funds", supremo: "clout", showman: "media", idealist: "trust" };
export const IDEOLOGY_OF = { funds: "capitalist", clout: "supremo", media: "showman", trust: "idealist" };

// Canonical SHASN ideology colors: Capitalist=green, Supremo=red, Showman=blue, Idealist=yellow.
export const ACCENT = { capitalist: "#2f9e57", supremo: "#c0392b", showman: "#2f6fb0", idealist: "#d6a90a" };

// Pile count -> unlocked level (0/4/6) per the rulebook's two-power model.
export function tierOf(pileCount) {
  if (pileCount >= 6) return 6;
  if (pileCount >= 4) return 4;
  return 0;
}
