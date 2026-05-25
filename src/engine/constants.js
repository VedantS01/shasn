export const IDEOLOGIES = ["capitalist", "supremo", "showstopper", "idealist"];
export const RESOURCES = ["funds", "clout", "media", "trust"];

export const RESOURCE_OF = { capitalist: "funds", supremo: "clout", showstopper: "media", idealist: "trust" };
export const IDEOLOGY_OF = { funds: "capitalist", clout: "supremo", media: "showstopper", trust: "idealist" };

export const ACCENT = { capitalist: "#caa12f", supremo: "#b3472f", showstopper: "#a8327d", idealist: "#2f6aa8" };

// pile count -> unlocked tier (0..3)
export function tierOf(pileCount) {
  if (pileCount >= 5) return 3;
  if (pileCount >= 3) return 2;
  if (pileCount >= 2) return 1;
  return 0;
}
