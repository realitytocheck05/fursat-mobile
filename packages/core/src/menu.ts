/**
 * Menu import from the FURSAT website data (single source of truth for names and prices):
 *   src/data/food.json   [{ section, items:[{ name, price, veg, spicy, chefSpecial, section, description }] }]
 *   src/data/drinks.json [{ section, items:[{ name, description, price, veg, alc, section, spicy, chefSpecial }] }]
 *   src/data/dish-photos.json { photos: { "<exact name>": { src, sm, xs, w, h, todo? } } }
 * Prices in the JSON are whole rupees.
 */
import { rupeesToPaise, type Paise } from "./money";

export type Side = "food" | "drinks";

export interface SourceItem {
  name: string;
  price: number;
  veg?: boolean;
  spicy?: boolean;
  chefSpecial?: boolean;
  alc?: boolean;
  description?: string;
  section?: string;
}
export interface SourceSection {
  section: string;
  items: SourceItem[];
}
export interface SourcePhoto {
  src: string;
  sm?: string;
  xs?: string;
  w?: number;
  h?: number;
  todo?: string;
}

export interface MenuSectionRow {
  id: string;
  tenant: string;
  side: Side;
  name: string;
  sort: number;
  is_bar: boolean;
}
export interface MenuItemRow {
  id: string;
  tenant: string;
  section_id: string;
  source_name: string;
  description: string | null;
  price_paise: Paise;
  is_veg: boolean | null;
  spicy: boolean;
  chef_special: boolean;
  is_bar: boolean;
  photo: string | null;
  photo_unconfirmed: boolean;
  available: boolean;
  sort: number;
}

export const slugify = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "x";

export interface ImportResult {
  sections: MenuSectionRow[];
  items: MenuItemRow[];
  report: { side: Side; section: string; items: number; withPhoto: number }[];
  warnings: string[];
}

export function importMenu(tenant: string, food: SourceSection[], drinks: SourceSection[], photos: Record<string, SourcePhoto> = {}): ImportResult {
  const sections: MenuSectionRow[] = [];
  const items: MenuItemRow[] = [];
  const report: ImportResult["report"] = [];
  const warnings: string[] = [];
  const usedIds = new Set<string>();
  const photoKeys = new Map(Object.keys(photos).map((k) => [k.trim().toLowerCase(), k]));

  const take = (base: string) => {
    let id = base,
      n = 2;
    while (usedIds.has(id)) id = `${base}-${n++}`;
    usedIds.add(id);
    return id;
  };

  const run = (side: Side, list: SourceSection[]) => {
    list.forEach((sec, si) => {
      const sectionId = take(`${tenant}:${side}:${slugify(sec.section)}`);
      const sectionIsBar = side === "drinks" && sec.items.length > 0 && sec.items.every((i) => i.alc === true);
      sections.push({ id: sectionId, tenant, side, name: sec.section, sort: si, is_bar: sectionIsBar });
      let withPhoto = 0;
      sec.items.forEach((it, ii) => {
        if (!it.name?.trim()) {
          warnings.push(`${side}/${sec.section}: item ${ii} has no name, skipped`);
          return;
        }
        if (typeof it.price !== "number" || it.price < 0) {
          warnings.push(`${side}/${sec.section}/${it.name}: missing price, skipped (TODO(client))`);
          return;
        }
        const key = photoKeys.get(it.name.trim().toLowerCase());
        const ph = key ? photos[key] : undefined;
        if (ph) withPhoto++;
        if (ph?.todo) warnings.push(`photo for "${it.name}" is unconfirmed: ${ph.todo}`);
        items.push({
          id: take(`${sectionId}:${slugify(it.name)}`),
          tenant,
          section_id: sectionId,
          source_name: it.name.trim(),
          description: it.description?.trim() || null,
          price_paise: rupeesToPaise(it.price),
          is_veg: typeof it.veg === "boolean" ? it.veg : null,
          spicy: !!it.spicy,
          chef_special: !!it.chefSpecial,
          is_bar: it.alc === true,
          photo: ph ? (ph.sm ?? ph.src) : null,
          photo_unconfirmed: !!ph?.todo,
          available: true,
          sort: ii,
        });
      });
      report.push({ side, section: sec.section, items: sec.items.length, withPhoto });
    });
  };
  run("food", food);
  run("drinks", drinks);
  return { sections, items, report, warnings };
}
