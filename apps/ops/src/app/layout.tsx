import type { ReactNode } from "react";
import { brandCss, fursat } from "@bjn/brand";

export const metadata = { title: "Fursat · Staff", robots: { index: false, follow: false } };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style>{`${brandCss(fursat)} body{margin:0;background:var(--c-surface);color:var(--c-ink);font-family:var(--font-body)} h1{font-family:var(--font-display);font-weight:500;color:var(--c-heading)}`}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
