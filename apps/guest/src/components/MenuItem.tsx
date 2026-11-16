import { formatINR, type MenuItemRow } from "@bjn/core";
import { motion, AnimatePresence } from "motion/react";

/** FSSAI-style veg / non-veg mark: square outline with a dot (veg) or triangle (non-veg). */
export function VegMark({ veg }: { veg: boolean | null }) {
  if (veg === null) return null;
  const c = veg ? "var(--c-veg)" : "var(--c-non-veg)";
  return (
    <span role="img" aria-label={veg ? "Vegetarian" : "Non-vegetarian"} className="inline-grid size-[14px] shrink-0 place-items-center border-[1.5px]" style={{ borderColor: c }}>
      {veg ? <span className="size-[6px] rounded-full" style={{ background: c }} /> : <span className="h-0 w-0 border-x-[4px] border-b-[7px] border-x-transparent" style={{ borderBottomColor: c }} />}
    </span>
  );
}

export function MenuItem({ item, qty, onAdd, onRemove }: { item: MenuItemRow; qty: number; onAdd: () => void; onRemove: () => void }) {
  const soldOut = !item.available;
  return (
    <li className={`card flex gap-3 p-3 ${soldOut ? "opacity-60" : ""}`}>
      {item.photo ? (
        <img src={item.photo} alt="" loading="lazy" decoding="async" width={84} height={84} className="size-[84px] shrink-0 rounded-[14px] object-cover" style={{ filter: "saturate(1.1) sepia(.12) contrast(1.04)" }} />
      ) : (
        <div aria-hidden className="grid size-[84px] shrink-0 place-items-center rounded-[14px] border border-edge/40 bg-sunk font-display text-2xl text-accent-text">
          {item.source_name.charAt(0)}
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-2">
          <span className="mt-[3px]"><VegMark veg={item.is_veg} /></span>
          <h3 className="text-[1.02rem] leading-snug">{item.source_name}</h3>
        </div>
        {item.description && <p className="mt-1 line-clamp-2 text-[0.82rem] leading-snug text-muted">{item.description}</p>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="font-display text-[1.05rem] tabular-nums text-ink">
            {formatINR(item.price_paise)}
            {item.chef_special && <span className="ml-2 align-middle font-body text-[0.68rem] font-semibold uppercase tracking-[.12em] text-accent-text">Chef's pick</span>}
            {item.spicy && <span className="ml-2 align-middle font-body text-[0.68rem] font-semibold uppercase tracking-[.12em] text-[var(--c-non-veg)]">Spicy</span>}
          </span>
          {soldOut ? (
            <span className="text-[0.8rem] font-medium text-muted">Sold out</span>
          ) : qty === 0 ? (
            <button onClick={onAdd} className="btn-action !min-h-[40px] !px-4 !text-[0.9rem]" aria-label={`Add ${item.source_name}`}>Add</button>
          ) : (
            <div className="flex items-center gap-1 rounded-full border border-edge bg-sunk p-1" role="group" aria-label={`${item.source_name} quantity`}>
              <button onClick={onRemove} className="grid size-9 place-items-center rounded-full text-lg text-heading active:scale-95" aria-label="Remove one">−</button>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span key={qty} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }} transition={{ type: "spring", stiffness: 600, damping: 32 }} className="w-6 text-center font-semibold tabular-nums" aria-live="polite">
                  {qty}
                </motion.span>
              </AnimatePresence>
              <button onClick={onAdd} className="grid size-9 place-items-center rounded-full bg-action text-lg text-action-ink active:scale-95" aria-label="Add one">+</button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
