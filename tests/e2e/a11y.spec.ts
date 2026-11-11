import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { ALL_PAGES } from "./pages";

// Zero serious/critical axe violations, at desktop AND mobile viewport.
const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 375, height: 812 },
];

const expectAxeClean = async (page: Page) => {
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter((v) =>
    ["serious", "critical"].includes(v.impact ?? "")
  );
  expect(
    blocking,
    blocking
      .map((v) => `${v.id}: ${v.nodes.length} nodes — ${v.help}`)
      .join("\n")
  ).toEqual([]);
};

for (const vp of VIEWPORTS) {
  for (const path of ALL_PAGES) {
    test(`axe clean: ${path} @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expectAxeClean(page);
    });
  }
}

test("axe clean: header menu open @ mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.locator(".site-menu summary").click();
  await expect(page.locator(".site-menu").getByRole("link").first()).toBeVisible();
  await expectAxeClean(page);
});
