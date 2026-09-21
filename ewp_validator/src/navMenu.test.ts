import { describe, expect, it } from "vitest";
import { nextNavMenuOpen, PHONE_NAV_MAX_WIDTH } from "../../shared/navMenu";

describe("phone nav drawer", () => {
  it("the toggle button flips the drawer", () => {
    expect(nextNavMenuOpen(false, "toggle")).toBe(true);
    expect(nextNavMenuOpen(true, "toggle")).toBe(false);
  });

  it("every other event closes it and never opens it", () => {
    for (const event of ["link", "outside", "escape", "resize-wide"] as const) {
      expect(nextNavMenuOpen(true, event)).toBe(false);
      expect(nextNavMenuOpen(false, event)).toBe(false);
    }
  });

  it("the breakpoint matches the CSS media query", async () => {
    const { readFileSync } = await import("node:fs");
    const css = readFileSync(new URL("../../shared/theme.css", import.meta.url), "utf8");
    expect(css).toContain(`@media (max-width: ${PHONE_NAV_MAX_WIDTH}px)`);
  });
});
