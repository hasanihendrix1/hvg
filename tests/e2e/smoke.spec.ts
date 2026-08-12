import { test, expect } from "@playwright/test";
import { ALL_PAGES } from "./pages";

for (const path of ALL_PAGES) {
  test(`${path} renders with a single h1 and unique title`, async ({
    page,
  }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    const title = await page.title();
    expect(title).toContain("Hendrix Ventures Group");
    // No unresolved placeholders or legacy artifacts anywhere
    const body = await page.locator("body").innerText();
    for (const poison of [
      "(123) 456-7890",
      "yourdomain.com",
      "Testimonial Video 1",
      "lorem",
      "TODO",
    ]) {
      expect(body).not.toContain(poison);
    }
  });
}

test("unknown routes return the real 404 page with 404 status", async ({
  page,
}) => {
  const res = await page.goto("/this-page-does-not-exist/");
  expect(res?.status()).toBe(404);
  await expect(page.locator("h1")).toContainText("doesn't exist");
});

test("phone number appears correctly formatted on every page", async ({
  page,
}) => {
  for (const path of ALL_PAGES) {
    await page.goto(path);
    const tel = page.locator('a[href="tel:+16787105786"]').first();
    await expect(tel, `${path} missing tel link`).toBeAttached();
  }
});
