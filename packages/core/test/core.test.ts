import { describe, expect, it } from "vitest";
import { billTotals, buildOrder, canTransition, formatINR, importMenu, nextStatus, rupeesToPaise, signTableCode, slugify, tableQrUrl, verifyTableCode, type MenuRowForOrder } from "../src";
import { brandCss, contrast, fursat, getBrand, richmondHouse } from "../../brand/src";

const SECRET = "test-secret-test-secret-test-secret-123";

describe("money", () => {
  it("converts and formats INR", () => {
    expect(rupeesToPaise(399)).toBe(39900);
    expect(formatINR(39900)).toBe("₹399");
    expect(formatINR(125050)).toBe("₹1,250.50");
    expect(() => rupeesToPaise(-1)).toThrow();
  });
});

describe("GST (restaurant 5%, no service charge)", () => {
  it("splits CGST/SGST and rounds half up", () => {
    const t = billTotals([{ itemId: "a", name: "A", unitPaise: 39900, qty: 2 }]);
    expect(t.subtotal).toBe(79800);
    expect(t.cgst).toBe(1995);
    expect(t.sgst).toBe(1995);
    expect(t.total).toBe(83790);
    expect(t.serviceCharge).toBe(0);
  });
  it("rounds odd halves", () => {
    const t = billTotals([{ itemId: "a", name: "A", unitPaise: 10, qty: 1 }]); // 2.5% of 10 = 0.25 -> 0
    expect(t.cgst).toBe(0);
    const u = billTotals([{ itemId: "a", name: "A", unitPaise: 20, qty: 1 }]); // 0.5 -> 1
    expect(u.cgst).toBe(1);
  });
  it("supports IGST and empty bills", () => {
    expect(billTotals([], { gstBps: 500, intraState: false }).total).toBe(0);
    expect(billTotals([{ itemId: "a", name: "A", unitPaise: 10000, qty: 1 }], { gstBps: 500, intraState: false }).igst).toBe(500);
  });
  it("rejects bad quantities", () => {
    expect(() => billTotals([{ itemId: "a", name: "A", unitPaise: 100, qty: 0 }])).toThrow();
  });
});

describe("table QR", () => {
  it("signs and verifies", async () => {
    const s = await signTableCode("fursat", "t7", SECRET);
    expect(s).toHaveLength(22);
    expect(await verifyTableCode("fursat", "T7", s, SECRET)).toBe(true);
  });
  it("rejects tampering, other tenants, other tables, junk", async () => {
    const s = await signTableCode("fursat", "T7", SECRET);
    expect(await verifyTableCode("fursat", "T8", s, SECRET)).toBe(false);
    expect(await verifyTableCode("richmond-house", "T7", s, SECRET)).toBe(false);
    expect(await verifyTableCode("fursat", "T7", s.slice(0, -1) + (s.endsWith("A") ? "B" : "A"), SECRET)).toBe(false);
    expect(await verifyTableCode("fursat", "../etc", s, SECRET)).toBe(false);
    expect(await verifyTableCode("fursat", "T7", null, SECRET)).toBe(false);
  });
  it("builds the URL and refuses weak secrets", async () => {
    expect(await tableQrUrl("https://app.fursatind.in/", "fursat", "b2", SECRET)).toMatch(/^https:\/\/app\.fursatind\.in\/t\/B2\?s=[\w-]{22}$/);
    await expect(signTableCode("fursat", "T1", "short")).rejects.toThrow();
  });
});

describe("order status", () => {
  it("follows the kitchen flow", () => {
    expect(nextStatus("placed")).toBe("accepted");
    expect(nextStatus("ready")).toBe("served");
    expect(nextStatus("served")).toBeNull();
    expect(canTransition("ready", "cancelled")).toBe(false);
    expect(canTransition("placed", "cancelled")).toBe(true);
  });
});

describe("menu import", () => {
  const food = [{ section: "Desserts", items: [{ name: "Tiramisu", price: 299, veg: true }, { name: "Tiramisu", price: 349, veg: true }] }];
  const drinks = [
    { section: "Whisky", items: [{ name: "JW Black Label", price: 650, alc: true, veg: true }] },
    { section: "Coffee", items: [{ name: "CAFE LATTE", price: 199, alc: false }] },
  ];
  const r = importMenu("fursat", food, drinks, { "Cafe Latte": { src: "/a.webp", sm: "/a-sm.webp" }, Tiramisu: { src: "/t.webp", todo: "confirm" } });
  it("keeps names and prices exact, stable unique ids", () => {
    expect(r.items.map((i) => i.id)).toEqual(["fursat:food:desserts:tiramisu", "fursat:food:desserts:tiramisu-2", "fursat:drinks:whisky:jw-black-label", "fursat:drinks:coffee:cafe-latte"]);
    expect(r.items[0]!.price_paise).toBe(29900);
    expect(r.items[2]!.is_bar).toBe(true);
    expect(r.sections.find((s) => s.name === "Whisky")!.is_bar).toBe(true);
    expect(r.sections.find((s) => s.name === "Coffee")!.is_bar).toBe(false);
  });
  it("matches photos case-insensitively and flags unconfirmed ones", () => {
    expect(r.items[3]!.photo).toBe("/a-sm.webp");
    expect(r.items[0]!.photo_unconfirmed).toBe(true);
    expect(r.warnings.some((w) => w.includes("unconfirmed"))).toBe(true);
  });
  it("slugifies", () => expect(slugify("Mac & Cheese (Kids)")).toBe("mac-and-cheese-kids"));
});

describe("buildOrder (server-side)", () => {
  const menu = new Map<string, MenuRowForOrder>([
    ["f:latte", { id: "f:latte", tenant: "fursat", source_name: "CAFE LATTE", price_paise: 19900, available: true, is_bar: false }],
    ["f:jw", { id: "f:jw", tenant: "fursat", source_name: "JW Black Label", price_paise: 65000, available: true, is_bar: true }],
    ["f:gone", { id: "f:gone", tenant: "fursat", source_name: "Tiramisu", price_paise: 29900, available: false, is_bar: false }],
    ["r:x", { id: "r:x", tenant: "richmond-house", source_name: "X", price_paise: 100, available: true, is_bar: false }],
  ]);
  const session = { id: "s1", tenant: "fursat", closed_at: null };
  const settings = { tax: { gstBps: 500, intraState: true }, barOrdersViaQr: true, maxLines: 30 };
  const id = "6f1c2a9e-3b4d-4c5e-8f60-7a8b9c0d1e2f";

  it("prices from the database, merges duplicates", () => {
    const r = buildOrder({ clientOrderId: id, lines: [{ itemId: "f:latte", qty: 1 }, { itemId: "f:latte", qty: 2 }] }, menu, session, settings);
    expect(r.ok && r.totals.subtotal).toBe(59700);
    expect(r.ok && r.lines).toHaveLength(1);
  });
  it("refuses closed sessions, sold out, other tenants, bad qty", () => {
    expect(buildOrder({ clientOrderId: id, lines: [{ itemId: "f:latte", qty: 1 }] }, menu, { ...session, closed_at: "now" }, settings)).toMatchObject({ ok: false, code: "SESSION_CLOSED" });
    expect(buildOrder({ clientOrderId: id, lines: [{ itemId: "f:gone", qty: 1 }] }, menu, session, settings)).toMatchObject({ ok: false, code: "SOLD_OUT" });
    expect(buildOrder({ clientOrderId: id, lines: [{ itemId: "r:x", qty: 1 }] }, menu, session, settings)).toMatchObject({ ok: false, code: "UNKNOWN_ITEM" });
    expect(buildOrder({ clientOrderId: id, lines: [{ itemId: "f:latte", qty: 99 }] }, menu, session, settings)).toMatchObject({ ok: false, code: "BAD_LINE" });
    expect(buildOrder({ clientOrderId: "nope", lines: [{ itemId: "f:latte", qty: 1 }] }, menu, session, settings)).toMatchObject({ ok: false, code: "BAD_ID" });
  });
  it("enforces bar rules", () => {
    expect(buildOrder({ clientOrderId: id, lines: [{ itemId: "f:jw", qty: 1 }] }, menu, session, settings)).toMatchObject({ ok: false, code: "BAR_NOT_CONFIRMED" });
    expect(buildOrder({ clientOrderId: id, lines: [{ itemId: "f:jw", qty: 1 }], barConfirmed21: true }, menu, session, { ...settings, barOrdersViaQr: false })).toMatchObject({ ok: false, code: "BAR_NOT_ALLOWED" });
    expect(buildOrder({ clientOrderId: id, lines: [{ itemId: "f:jw", qty: 1 }], barConfirmed21: true }, menu, session, settings)).toMatchObject({ ok: true, hasBar: true });
  });
});

describe("brand tokens (real FURSAT values)", () => {
  it("come from fk-tokens.css", () => {
    expect(fursat.tokens.color.surface).toBe("#f6e4c9");
    expect(fursat.tokens.color.action).toBe("#24502f");
    expect(fursat.tokens.font.body).toContain("Poppins");
    expect(getBrand("nope").slug).toBe("fursat");
    expect(brandCss(fursat)).toContain("--c-action: #24502f;");
  });
  it("meet WCAG contrast for text roles", () => {
    const c = fursat.tokens.color;
    expect(contrast(c.ink, c.surface)).toBeGreaterThan(4.5);
    expect(contrast(c.textAccent, c.surface)).toBeGreaterThan(4.5);
    expect(contrast(c.actionInk, c.action)).toBeGreaterThan(4.5);
    expect(contrast(c.selectedInk, c.selected)).toBeGreaterThan(4.5);
    expect(contrast(c.heading, c.surface)).toBeGreaterThan(4.5);
    const r = richmondHouse.tokens.color;
    expect(contrast(r.ink, r.surface)).toBeGreaterThan(4.5);
    expect(contrast(r.actionInk, r.action)).toBeGreaterThan(4.5);
  });
});
