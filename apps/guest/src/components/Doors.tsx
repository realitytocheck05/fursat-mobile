import { motion } from "motion/react";
import type { Side } from "@bjn/core";
import { tap } from "../lib/native";

/** Food | Drinks switch. The gold "selected" pill glides between sides (layoutId spring). Swipe on the list also switches. */
export function Doors({ side, onChange }: { side: Side; onChange: (s: Side) => void }) {
  const sides: { id: Side; label: string; hint: string }[] = [
    { id: "food", label: "Food", hint: "Kitchen & café" },
    { id: "drinks", label: "Drinks", hint: "Bar, coffee & shakes" },
  ];
  return (
    <div role="tablist" aria-label="Menu side" className="relative mx-4 grid grid-cols-2 rounded-full border border-edge/60 bg-raised p-1 shadow-[inset_0_1px_0_#fff]">
      {sides.map((s) => {
        const active = side === s.id;
        return (
          <button
            key={s.id}
            role="tab"
            aria-selected={active}
            aria-controls="menu-list"
            onClick={() => {
              if (!active) {
                tap();
                onChange(s.id);
              }
            }}
            className="relative z-10 flex min-h-[52px] flex-col items-center justify-center rounded-full px-3"
          >
            {active && (
              <motion.span
                layoutId="door-pill"
                transition={{ type: "spring", stiffness: 520, damping: 38 }}
                className="absolute inset-0 -z-10 rounded-full"
                style={{ background: "linear-gradient(180deg,var(--c-selected),var(--c-selected-deep))", boxShadow: "0 0 0 1px var(--c-selected-edge), inset 0 1px 0 rgba(255,250,235,.7)" }}
              />
            )}
            <span className="font-display text-[1.05rem] leading-none text-heading">{s.label}</span>
            <span className={`mt-1 text-[0.7rem] leading-none ${active ? "text-selected-ink" : "text-muted"}`}>{s.hint}</span>
          </button>
        );
      })}
    </div>
  );
}
