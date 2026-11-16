import type { Brand } from "./types";

/**
 * FURSAT tokens, copied 1:1 from the live website repo:
 *   alekyareality/fursat-astro @ design/reference-layout (commit 2e19aba, v5.12a)
 *   src/styles/fk-tokens.css  (v4.4 colour roles, restyle tokens, v5.12a motion tokens, plaster)
 *   src/data/site.json        (name, tagline)
 * Colour roles (owner rule): green = main action, gold = selected, brown = small gold-toned text.
 * Do not add colours here that are not in fk-tokens.css.
 */
export const fursat: Brand = {
  slug: "fursat",
  name: "Fursat Kitchen | Bar",
  shortName: "Fursat",
  tagline: "Your Fursat, Served.",
  tokens: {
    source: "fursat-astro@2e19aba src/styles/fk-tokens.css",
    color: {
      surface: "#f6e4c9", // --fk-plaster-base (one plaster for every page)
      surfaceRaised: "#fbf3e7", // .fk-card gradient top
      surfaceSunk: "#fffaf2", // form inputs on cream pages
      ink: "#2b2416", // --fk-ink
      inkMuted: "#4a4232", // .fk-card__p
      heading: "#1b3a26", // .hy-h1 / .hy-h2
      action: "#24502f", // --fk-action-bg top
      actionDeep: "#14321e", // --fk-action-bg bottom
      actionInk: "#fbf3e6", // --fk-action-fg
      actionRim: "#d9b36a", // --fk-action-rim
      selected: "#f4d38c", // --fk-selected-bg top
      selectedDeep: "#e3ab4a", // --fk-selected-bg bottom
      selectedInk: "#2a1d0c", // --fk-selected-fg
      selectedEdge: "#a8731c", // --fk-selected-edge
      edge: "#d6aa5a", // --fk-edge
      iconAccent: "#a0681a", // --fk-icon-gold
      textAccent: "#74501a", // --fk-text-gold (5:1+ on cream)
      focus: "#8a5a14", // --fk-focus
      danger: "#c0291f", // --fk-red
      warning: "#c27a2c", // --fk-amber
      veg: "#24502f", // FSSAI mark uses the brand green (same as action)
      nonVeg: "#c0291f", // FSSAI mark uses --fk-red
      dark: "#0e2214", // --fk-forest-900 (bar mode, ticket)
      darkInk: "#f8eee2", // --fk-cream (master cream on dark)
    },
    font: {
      display: '"Playfair Display", Georgia, serif', // --fk-serif
      body: "Poppins, system-ui, sans-serif", // --fk-sans
      script: '"Cormorant Garamond", Georgia, serif', // --fk-script
    },
    radius: { sm: "12px", md: "20px", lg: "28px", pill: "9999px" }, // --radius-fk-*
    motion: {
      easeOut: "cubic-bezier(0.23, 1, 0.32, 1)", // --fk-ease-out
      easeInOut: "cubic-bezier(0.77, 0, 0.175, 1)", // --fk-ease-in-out
      durFast: 120, // --fk-dur-1
      durBase: 200, // --fk-dur-2
      durSlow: 320, // --fk-dur-3
      durScene: 480, // --fk-dur-4
      durPress: 150, // --fk-dur-press
      pressScale: 0.96, // .fk-press:active
      revealY: 12, // --fk-reveal-y
    },
  },
};
