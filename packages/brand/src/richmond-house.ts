import type { Brand } from "./types";

/**
 * Richmond House demo tenant. Values copied from the BJNEXUS brand pack
 * (Brand-Pack_Roastique-Richmond.html, :root variables, 13 Nov 2026), which the client has not approved yet.
 * Keep it labelled DEMO until they sign off.
 */
export const richmondHouse: Brand = {
  slug: "richmond-house",
  name: "Richmond House (demo)",
  shortName: "Richmond",
  tagline: "TODO(client)",
  tokens: {
    source: "Brand-Pack_Roastique-Richmond.html :root (BJNEXUS proposal, not client-approved)",
    color: {
      surface: "#f3eee6", // --paper
      surfaceRaised: "#efe9df", // --stone
      surfaceSunk: "#e3dbcd", // --stone2
      ink: "#1c1814", // --text
      inkMuted: "#5a524b", // --muted
      heading: "#14201c", // --ink
      action: "#1d2b26", // --ink2
      actionDeep: "#14201c", // --ink
      actionInk: "#f3eee6", // --paper
      actionRim: "#b08a4f", // --brass
      selected: "#d9b67c", // --brasslt
      selectedDeep: "#b08a4f", // --brass
      selectedInk: "#14201c",
      selectedEdge: "#b08a4f",
      edge: "#d9b67c",
      iconAccent: "#b08a4f",
      textAccent: "#8a4b22", // --crust
      focus: "#b08a4f",
      danger: "#e8743b", // --ember
      warning: "#d39a5a", // --caramel
      veg: "#1d2b26",
      nonVeg: "#8a4b22",
      dark: "#1d1410", // --espresso
      darkInk: "#f5ede1", // --flour
    },
    font: { display: '"Instrument Serif", Georgia, serif', body: "Manrope, system-ui, sans-serif" },
    radius: { sm: "10px", md: "18px", lg: "24px", pill: "9999px" },
    motion: {
      easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
      easeInOut: "cubic-bezier(0.77, 0, 0.175, 1)",
      durFast: 120,
      durBase: 200,
      durSlow: 320,
      durScene: 480,
      durPress: 150,
      pressScale: 0.97,
      revealY: 12,
    },
  },
};
