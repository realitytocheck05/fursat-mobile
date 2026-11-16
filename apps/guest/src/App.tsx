import { billTotals, formatINR, type MenuItemRow, type Side } from "@bjn/core";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { BarGate } from "./components/BarGate";
import { Doors } from "./components/Doors";
import { MenuItem } from "./components/MenuItem";
import { barConfirmed, confirmBar, loadMenu, type MenuSnapshot } from "./lib/menu";
import { tap } from "./lib/native";

type Cart = Record<string, number>;
const CART_KEY = "fz_cart_v1";

export function App({ brandName, tagline }: { brandName: string; tagline: string }) {
  const [menu, setMenu] = useState<MenuSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [side, setSide] = useState<Side>(() => (sessionStorage.getItem("fz_side") as Side) || "food");
  const [query, setQuery] = useState("");
  const [vegOnly, setVegOnly] = useState(false);
  const [bar21, setBar21] = useState(barConfirmed());
  const [gate, setGate] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [cart, setCart] = useState<Cart>(() => JSON.parse(localStorage.getItem(CART_KEY) || "{}"));
  const table = new URLSearchParams(location.search).get("table"); // set by the /t/<code> route in session C1

  useEffect(() => {
    loadMenu().then(setMenu, (e: Error) => setError(e.message));
  }, []);
  useEffect(() => localStorage.setItem(CART_KEY, JSON.stringify(cart)), [cart]);
  useEffect(() => sessionStorage.setItem("fz_side", side), [side]);

  const sections = useMemo(() => {
    if (!menu) return [];
    const q = query.trim().toLowerCase();
    return menu.sections
      .filter((s) => s.side === side && (!s.is_bar || bar21))
      .map((s) => ({
        ...s,
        items: menu.items.filter((i) => i.section_id === s.id && (!vegOnly || i.is_veg === true) && (!q || i.source_name.toLowerCase().includes(q) || (i.description ?? "").toLowerCase().includes(q))),
      }))
      .filter((s) => s.items.length > 0);
  }, [menu, side, query, vegOnly, bar21]);
  const hiddenBar = !!menu && side === "drinks" && !bar21 && menu.sections.some((s) => s.side === "drinks" && s.is_bar);

  const byId = useMemo(() => new Map((menu?.items ?? []).map((i) => [i.id, i] as const)), [menu]);
  const lines = Object.entries(cart).flatMap(([id, qty]) => {
    const it = byId.get(id);
    return it && qty > 0 ? [{ itemId: id, name: it.source_name, unitPaise: it.price_paise, qty }] : [];
  });
  const totals = billTotals(lines);
  const count = lines.reduce((n, l) => n + l.qty, 0);

  const add = (it: MenuItemRow) => {
    tap();
    setCart((c) => ({ ...c, [it.id]: Math.min((c[it.id] ?? 0) + 1, 20) }));
  };
  const remove = (it: MenuItemRow) => {
    tap();
    setCart((c) => {
      const n = (c[it.id] ?? 0) - 1;
      const next = { ...c };
      if (n <= 0) delete next[it.id];
      else next[it.id] = n;
      return next;
    });
  };

  // scroll-spy for the section chips
  const listRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const els = listRef.current?.querySelectorAll<HTMLElement>("[data-section]");
      if (!els?.length) return;
      const line = (stickyRef.current?.getBoundingClientRect().bottom ?? 0) + 12;
      let current = els[0]!.dataset.section ?? null;
      for (const el of els) if (el.getBoundingClientRect().top <= line) current = el.dataset.section ?? current;
      setActive(current);
    };
    const onScroll = () => (raf ||= requestAnimationFrame(update));
    update();
    addEventListener("scroll", onScroll, { passive: true });
    return () => {
      removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [sections]);
  // keep the active chip visible in the chip row
  useEffect(() => {
    if (active) document.getElementById(`chip-${active}`)?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [active]);

  const jump = (id: string) => {
    tap();
    document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  };

  return (
    <div className="mx-auto min-h-dvh max-w-[560px] pb-[calc(112px+var(--safe-b))]">
      <header className="px-5 pb-3 pt-[calc(18px+env(safe-area-inset-top,0px))]">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[.15em] text-accent-text">{table ? `Table ${table} · Order here` : "Menu"}</p>
        <h1 className="mt-1 text-[2rem] leading-[1.05]">{brandName}</h1>
        <p className="mt-1 font-display text-[1.05rem] italic text-heading/80">{tagline}</p>
      </header>

      <div ref={stickyRef} className="sticky top-0 z-30 bg-surface/95 pb-2 pt-2 backdrop-blur">
        <Doors side={side} onChange={(s) => { setSide(s); setQuery(""); window.scrollTo({ top: 0 }); }} />
        <div className="mx-4 mt-3 flex gap-2">
          <label className="relative flex-1">
            <span className="sr-only">Search the menu</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} type="search" placeholder={side === "food" ? "Search dishes" : "Search drinks"} className="h-11 w-full rounded-full border border-edge/60 bg-sunk px-4 text-[16px] text-ink placeholder:text-muted/80" />
          </label>
          <button className="chip" aria-pressed={vegOnly} onClick={() => { tap(); setVegOnly((v) => !v); }}>Veg only</button>
        </div>
        <nav aria-label="Sections" className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-4">
          {sections.map((s) => (
            <button key={s.id} id={`chip-${s.id}`} className="chip" aria-pressed={active === s.id} onClick={() => jump(s.id)}>{s.name}</button>
          ))}
        </nav>
      </div>

      {error && <p role="alert" className="mx-4 mt-6 rounded-2xl bg-sunk p-4 text-[0.95rem]">{error}. Pull to refresh or try again.</p>}
      {!menu && !error && (
        <ul aria-busy="true" aria-label="Loading menu" className="mx-4 mt-4 grid gap-3">
          {Array.from({ length: 6 }, (_, i) => <li key={i} className="card h-[108px] animate-pulse opacity-70" />)}
        </ul>
      )}

      <motion.div
        id="menu-list"
        ref={listRef}
        role="tabpanel"
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.12}
        dragSnapToOrigin
        onDragEnd={(_, i) => {
          if (Math.abs(i.offset.x) < 70) return;
          const next: Side = i.offset.x < 0 ? "drinks" : "food";
          if (next !== side) { tap(); setSide(next); window.scrollTo({ top: 0 }); }
        }}
        className="touch-pan-y px-4"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={side} initial={{ opacity: 0, x: side === "drinks" ? 24 : -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}>
            {hiddenBar && (
              <button onClick={() => setGate(true)} className="mt-4 flex w-full items-center justify-between rounded-[20px] p-4 text-left" style={{ background: "var(--c-dark)", color: "var(--c-dark-ink)" }}>
                <span>
                  <span className="block font-display text-lg">Bar menu</span>
                  <span className="block text-[0.82rem] opacity-80">Cocktails, spirits, wine and beer · 21+ · dine-in only</span>
                </span>
                <span aria-hidden className="text-2xl text-[var(--c-selected)]">→</span>
              </button>
            )}
            {sections.map((s) => (
              <section key={s.id} id={`sec-${s.id}`} data-section={s.id} className="scroll-mt-[170px] pt-6" aria-labelledby={`h-${s.id}`}>
                <h2 id={`h-${s.id}`} className="mb-3 text-[1.35rem]">{s.name}</h2>
                <ul className="grid gap-3">
                  {s.items.map((it) => <MenuItem key={it.id} item={it} qty={cart[it.id] ?? 0} onAdd={() => add(it)} onRemove={() => remove(it)} />)}
                </ul>
              </section>
            ))}
            {menu && sections.length === 0 && <p className="mt-10 text-center text-muted">Nothing matches “{query}”. Try another word.</p>}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {count > 0 && (
          <motion.div initial={{ y: 120 }} animate={{ y: 0 }} exit={{ y: 120 }} transition={{ type: "spring", stiffness: 420, damping: 36 }} className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[560px] px-4" style={{ paddingBottom: "calc(14px + var(--safe-b))" }}>
            <button className="btn-action w-full !min-h-[58px] !justify-between !px-5" onClick={() => tap("medium")}>
              <span className="font-body text-[0.9rem] font-medium">{count} {count === 1 ? "item" : "items"} · {table ? "Review order" : "Your picks"}</span>
              <span className="tabular-nums">{formatINR(totals.subtotal)}<span className="ml-1 font-body text-[0.7rem] opacity-80">+ GST</span></span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {gate && <BarGate onClose={() => setGate(false)} onConfirm={() => { confirmBar(); setBar21(true); setGate(false); tap("success"); }} />}
    </div>
  );
}
