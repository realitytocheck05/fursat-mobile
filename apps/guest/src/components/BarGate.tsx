import { motion } from "motion/react";
import { useEffect, useRef } from "react";

/** One-time 21+ confirmation (Telangana legal drinking age). Dine-in only. Staff still check ID. */
export function BarGate({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true" aria-labelledby="bar-gate-title">
      <motion.button aria-label="Close" className="absolute inset-0 bg-black/45" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} />
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, i) => (i.offset.y > 90 || i.velocity.y > 600) && onClose()}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 40 }}
        className="relative w-full rounded-t-[28px] px-6 pt-3 text-dark-ink"
        style={{ background: "var(--c-dark)", paddingBottom: "calc(24px + var(--safe-b))" }}
      >
        <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-white/25" aria-hidden />
        <h2 id="bar-gate-title" className="!text-[var(--c-dark-ink)] text-2xl">The bar menu is for guests 21+</h2>
        <p className="mt-2 text-[0.92rem] leading-relaxed opacity-85">Alcohol is served for dine-in only, and our team may check your ID. Please drink responsibly.</p>
        <div className="mt-6 grid gap-3">
          <button ref={confirmRef} onClick={onConfirm} className="btn-action w-full">I am 21 or older</button>
          <button onClick={onClose} className="min-h-[48px] rounded-full border border-white/25 text-[0.95rem]">Not now</button>
        </div>
      </motion.div>
    </div>
  );
}
