import type { MenuItemRow, MenuSectionRow } from "@bjn/core";

export interface MenuSnapshot {
  tenant: string;
  generatedAt: string;
  sections: MenuSectionRow[];
  items: MenuItemRow[];
  packages: { id: string; group: string; name: string; price_paise: number }[];
  site: { phone: string; whatsapp: string; maps?: string; instagram?: string; hours: { display: string } };
}

/**
 * Loads the menu. Today: the offline snapshot made by `pnpm import:fursat` (cached by the service worker).
 * Session A3/B2 swaps this for Supabase (menu_sections, menu_items) and keeps the snapshot as the offline fallback.
 */
export async function loadMenu(): Promise<MenuSnapshot> {
  const res = await fetch("/data/fursat-menu.json");
  if (!res.ok) throw new Error(`Menu could not load (${res.status})`);
  return res.json();
}

const BAR_KEY = "fz_bar21";
export const barConfirmed = () => sessionStorage.getItem(BAR_KEY) === "1";
export const confirmBar = () => sessionStorage.setItem(BAR_KEY, "1");
