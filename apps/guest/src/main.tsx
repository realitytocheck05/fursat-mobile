import { MotionConfig } from "motion/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { applyBrand, currentBrand } from "./lib/brand";
import "./theme.css";

const brand = currentBrand();
applyBrand(brand);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <App brandName={brand.name} tagline={brand.tagline} />
    </MotionConfig>
  </StrictMode>,
);
