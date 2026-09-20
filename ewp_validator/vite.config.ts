import { defineConfig } from "vitest/config";

// GitHub Pages project sites serve at /<repo>/, not /. Vite's default base:'/'
// 404s on Pages if this is forgotten. This Tool now lives at a subpath under
// the ew_toolkit hub.
export default defineConfig({
  base: "/ew_toolkit/ewp_validator/",
  // monaco-yaml's worker imports path-browserify, a CommonJS file. The dev server serves it
  // unconverted unless it is pre-bundled, and the workers then fail ("module is not defined").
  optimizeDeps: { include: ["path-browserify"] },
  test: {
    environment: "node",
  },
});
