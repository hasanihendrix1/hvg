import { test, expect } from "@playwright/test";
import { ALL_PAGES } from "./pages";

// The audience is mobile-first (owner directive): these gates fail the
// build if any page scrolls horizontally on a small phone.
const WIDTHS = [360, 375];

for (const width of WIDTHS) {
  test(`no horizontal overflow on any page at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    for (const path of ALL_PAGES) {
      await page.goto(path);
      const overflow = await page.evaluate(() => {
        const doc = document.scrollingElement!;
        return doc.scrollWidth - doc.clientWidth;
      });
      expect(overflow, `${path} overflows by ${overflow}px at ${width}`).toBe(
        0
      );
    }
  });
}

test("mobile sticky bar shows seller actions on seller pages", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/");
  const bar = page.locator(".sticky-bar");
  await expect(bar).toBeVisible();
  await expect(bar.getByRole("link", { name: "Get my offer" })).toBeVisible();
});

test("mobile sticky bar shows investor actions on /investors", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/investors/");
  const bar = page.locator(".sticky-bar");
  await expect(bar).toBeVisible();
  await expect(
    bar.getByRole("link", { name: "Join the buyer list" })
  ).toBeVisible();
});

test("sticky bar never covers the last interactive element", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 800 });
  for (const path of ALL_PAGES) {
    await page.goto(path);
    await page.keyboard.press("End");
    await page.waitForTimeout(300);
    const clearance = await page.evaluate(() => {
      const bar = document.querySelector(".sticky-bar");
      const links = [...document.querySelectorAll("footer a")];
      if (!bar || links.length === 0) return 1;
      const barTop = bar.getBoundingClientRect().top;
      const lastLink = links[links.length - 1].getBoundingClientRect();
      return barTop - lastLink.bottom;
    });
    expect(clearance, `${path}: sticky bar overlaps footer links`).toBeGreaterThanOrEqual(0);
  }
});
