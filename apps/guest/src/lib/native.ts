/**
 * One place for device features. In the store app (Capacitor) these use native APIs;
 * in the browser PWA they fall back to web APIs or do nothing. Screens never import Capacitor directly.
 */
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Share } from "@capacitor/share";

export const isNative = () => Capacitor.isNativePlatform();
export const platform = () => Capacitor.getPlatform() as "ios" | "android" | "web";

export async function tap(kind: "light" | "medium" | "success" = "light") {
  try {
    if (isNative()) {
      if (kind === "success") await Haptics.notification({ type: NotificationType.Success });
      else await Haptics.impact({ style: kind === "medium" ? ImpactStyle.Medium : ImpactStyle.Light });
    } else if ("vibrate" in navigator) {
      navigator.vibrate(kind === "success" ? [10, 40, 18] : kind === "medium" ? 14 : 8);
    }
  } catch {
    /* haptics are a nicety; never break a flow */
  }
}

export async function share(title: string, text: string, url?: string) {
  if (isNative()) return Share.share({ title, text, url });
  if (navigator.share) return navigator.share({ title, text, url });
  await navigator.clipboard?.writeText([text, url].filter(Boolean).join(" "));
}

export const prefersReducedMotion = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
