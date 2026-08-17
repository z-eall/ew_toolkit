import { defineConfig } from "vite";

// GitHub Pages project sites serve at /<repo>/, not /. Must exactly match the
// renamed repo or built assets 404 (same gotcha as ewp_validator/vite.config.ts).
export default defineConfig({
  base: "/ew_toolkit/",
});
