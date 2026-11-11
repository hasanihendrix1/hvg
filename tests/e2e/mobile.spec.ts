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

// Below the width where the header's links fit, they sat behind nothing: the
// only way to another page was the footer.
const MENU_LINKS = [
  "How It Works",
  "Houses We've Bought",
  "Reviews",
  "About",
  "FAQ",
];

test("the header menu reaches every main page on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/");
  const menu = page.locator(".site-menu");
  await expect(menu.getByRole("link").first()).toBeHidden();

  await menu.locator("summary").click();
  for (const name of MENU_LINKS) {
    await expect(menu.getByRole("link", { name, exact: true })).toBeVisible();
  }

  await menu.getByRole("link", { name: "Reviews", exact: true }).click();
  await expect(page).toHaveURL(/\/reviews\/?$/);
  await expect(menu.getByRole("link").first()).toBeHidden();
  await menu.locator("summary").click();
  await expect(menu.locator('a[aria-current="page"]')).toHaveText("Reviews");
});

test("the open menu closes on Escape and on a tap outside it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/");
  const menu = page.locator(".site-menu");
  const firstLink = menu.getByRole("link").first();

  await menu.locator("summary").click();
  await expect(firstLink).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(firstLink).toBeHidden();
  await expect(menu.locator("summary")).toBeFocused();

  await menu.locator("summary").click();
  await expect(firstLink).toBeVisible();
  await page.mouse.click(20, 600);
  await expect(firstLink).toBeHidden();
});

test("tabbing past the last menu link closes the menu behind you", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/");
  const menu = page.locator(".site-menu");
  await menu.locator("summary").click();
  await menu.getByRole("link", { name: "FAQ", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(menu.getByRole("link").first()).toBeHidden();
});

// Held sideways, a phone is shorter than the open menu, and the sticky bar
// sits on top of whatever reaches the bottom of the screen.
for (const size of [
  { width: 568, height: 320 },
  { width: 667, height: 375 },
]) {
  test(`every menu link can be tapped at ${size.width}x${size.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await page.goto("/");
    const menu = page.locator(".site-menu");
    await menu.locator("summary").click();
    await menu
      .getByRole("link", { name: "FAQ", exact: true })
      .click({ timeout: 5000 });
    await expect(page).toHaveURL(/\/faq\/?$/);
  });
}

test("the header stays on one row at every width", async ({ page }) => {
  for (const width of [
    320, 349, 350, 360, 480, 639, 640, 768, 860, 861, 1024, 1179, 1180, 1280,
  ]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    const height = await page
      .locator(".site-header")
      .evaluate((el) => el.getBoundingClientRect().height);
    expect(height, `header wraps at ${width}px`).toBeLessThan(80);
    const overflow = await page.evaluate(() => {
      const doc = document.scrollingElement!;
      return doc.scrollWidth - doc.clientWidth;
    });
    expect(overflow, `header overflows at ${width}px`).toBe(0);
    // Exactly one way to the links: inline, or behind the button
    const inline = await page.locator(".site-nav").isVisible();
    const button = await page.locator(".site-menu summary").isVisible();
    expect(inline !== button, `links shown twice or not at all at ${width}px`).toBe(true);
    expect(inline, `inline links at ${width}px`).toBe(width >= 1180);
  }
});

test("wide screens keep the links inline, with the current page marked", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/about/");
  await expect(page.locator(".site-menu summary")).toHaveCount(1);
  await expect(page.locator(".site-menu summary")).toBeHidden();
  await expect(
    page.locator(".site-nav").getByRole("link", { name: "About", exact: true })
  ).toHaveAttribute("aria-current", "page");
});
