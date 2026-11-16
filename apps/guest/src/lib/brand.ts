import { brandCssVars, getBrand, type Brand } from "@bjn/brand";

/** Tenant comes from the build (VITE_TENANT) or ?tenant= for demos (e.g. the Richmond pitch). */
export function currentBrand(): Brand {
  const fromUrl = new URLSearchParams(location.search).get("tenant");
  if (fromUrl) sessionStorage.setItem("fz_tenant", fromUrl);
  return getBrand(fromUrl ?? sessionStorage.getItem("fz_tenant") ?? import.meta.env.VITE_TENANT ?? "fursat");
}

export function applyBrand(brand: Brand) {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(brandCssVars(brand))) root.style.setProperty(k, v);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", brand.tokens.color.surface);
  document.title = brand.name;
}
