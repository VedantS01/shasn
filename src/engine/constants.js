export const IDEOLOGIES = ["capitalist", "supremo", "showstopper", "idealist"];
export const RESOURCES = ["funds", "clout", "media", "trust"];

export const RESOURCE_OF = { capitalist: "funds", supremo: "clout", showstopper: "media", idealist: "trust" };
export const IDEOLOGY_OF = { funds: "capitalist", clout: "supremo", media: "showstopper", trust: "idealist" };

// Canonical SHASN ideology colors: Capitalist=green, Supremo=red, Showstopper=blue, Idealist=yellow.
export const ACCENT = { capitalist: "#2f9e57", supremo: "#c0392b", showstopper: "#2f6fb0", idealist: "#d6a90a" };

// pile count -> unlocked tier (0..3)
export function tierOf(pileCount) {
  if (pileCount >= 5) return 3;
  if (pileCount >= 3) return 2;
  if (pileCount >= 2) return 1;
  return 0;
}
