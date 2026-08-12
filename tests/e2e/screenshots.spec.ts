import { test } from "@playwright/test";
import { ALL_PAGES } from "./pages";

// The §19 screenshot matrix — mobile first. Artifacts land in
// screenshots/ for visual review (not pixel-compared yet; first baselines).
const VIEWPORTS = [
  { name: "mobile-360", width: 360, height: 800 },
  { name: "mobile-375", width: 375, height: 812 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "laptop-1366", width: 1366, height: 768 },
  { name: "desktop-1920", width: 1920, height: 1080 },
];

test.describe.configure({ mode: "parallel" });

for (const vp of VIEWPORTS) {
  test(`matrix @ ${vp.name}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    for (const path of ALL_PAGES) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const slug = path === "/" ? "home" : path.replaceAll("/", "");
      await page.screenshot({
        path: `screenshots/${vp.name}/${slug}.png`,
        fullPage: true,
      });
    }
  });
}
