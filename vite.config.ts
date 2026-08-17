import { resolve } from "node:path";
import { defineConfig } from "vite";

// GitHub Pages project sites serve at /<repo>/, not /. Must exactly match the
// renamed repo or built assets 404 (same gotcha as ewp_validator/vite.config.ts).
export default defineConfig({
  base: "/ew_toolkit/",
  build: {
    // Multi-page: index.html (Home) + support.html (Support). build-hub.mjs
    // relocates the built support.html into dist/support/index.html so it
    // serves at the /support/ subpath like every other page/Tool.
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        support: resolve(__dirname, "support.html"),
      },
    },
  },
});
