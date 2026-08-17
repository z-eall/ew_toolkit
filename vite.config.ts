import { defineConfig } from "vitest/config";

// GitHub Pages project sites serve at /<repo>/, not /. Vite's default base:'/'
// 404s on Pages if this is forgotten (see .scratch/ewp-toolkit/issues/12-repo-scaffold.md
// and research/05-web-app-mechanics.md).
export default defineConfig({
  base: "/ewp_toolkit/",
  test: {
    environment: "node",
  },
});
