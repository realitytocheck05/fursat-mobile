/** Brand tokens for one tenant. Every value must come from the client's real design files, never invented. */
export interface BrandTokens {
  /** Where the values were copied from, so anyone can re-check them. */
  source: string;
  color: {
    surface: string; // page background
    surfaceRaised: string; // cards, sheets
    surfaceSunk: string; // inputs, wells
    ink: string; // headings, body text
    inkMuted: string; // captions
    heading: string; // display headings
    action: string; // main action (button fill, top of gradient)
    actionDeep: string; // main action (bottom of gradient, pressed)
    actionInk: string; // text on the action colour
    actionRim: string; // thin rim around the action button
    selected: string; // selected chip / tab (top)
    selectedDeep: string; // selected chip / tab (bottom)
    selectedInk: string; // text on selected
    selectedEdge: string;
    edge: string; // card and sheet borders, ornaments
    iconAccent: string;
    textAccent: string; // small accent-coloured text that must pass 4.5:1
    focus: string; // focus ring
    danger: string;
    warning: string;
    veg: string; // FSSAI veg mark
    nonVeg: string; // FSSAI non-veg mark
    dark: string; // dark surfaces (bar mode, ticket)
    darkInk: string;
  };
  font: { display: string; body: string; script?: string };
  radius: { sm: string; md: string; lg: string; pill: string };
  motion: {
    easeOut: string;
    easeInOut: string;
    durFast: number; // ms
    durBase: number;
    durSlow: number;
    durScene: number;
    durPress: number;
    pressScale: number;
    revealY: number; // px
  };
}

export interface Brand {
  slug: string;
  name: string;
  shortName: string;
  tagline: string;
  tokens: BrandTokens;
}
