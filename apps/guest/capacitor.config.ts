import type { CapacitorConfig } from "@capacitor/cli";

// Store build: the SAME dist/ that is deployed as the PWA is bundled inside the native shell (no remote URL),
// so the app opens offline and passes review as a real app. API calls go to VITE_OPS_API over HTTPS.
const config: CapacitorConfig = {
  appId: "in.fursatind.app", // TODO(owner): confirm bundle id before creating store listings (cannot change later)
  appName: "Fursat",
  webDir: "dist",
  server: { androidScheme: "https" },
  plugins: {
    SplashScreen: { launchShowDuration: 600, backgroundColor: "#f6e4c9", showSpinner: false }, // --fk-plaster-base
    StatusBar: { style: "LIGHT", backgroundColor: "#f6e4c9", overlaysWebView: false },
  },
};
export default config;
