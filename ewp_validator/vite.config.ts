import { defineConfig } from "vitest/config";

// GitHub Pages project sites serve at /<repo>/, not /. Vite's default base:'/'
// 404s on Pages if this is forgotten (see .scratch/ew_toolkit/issues/12-repo-scaffold.md
// and research/05-web-app-mechanics.md). This Tool now lives at a subpath under
// the ew_toolkit hub (see .scratch/ew_toolkit/issues/16-restructure-into-hub-layout.md).
export default defineConfig({
  base: "/ew_toolkit/ewp_validator/",
  test: {
    environment: "node",
  },
});
