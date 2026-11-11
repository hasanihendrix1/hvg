import { test, expect } from "@playwright/test";

// The home gallery sits under "Houses we've bought", and most of its homes
// were assigned rather than bought outright. Each card must say which, and
// say exactly what the record page says.
test("every home in the home gallery shows its record status", async ({
  page,
}) => {
  await page.goto("/houses-weve-bought/");
  const recorded = new Map<string, string>();
  for (const card of await page.locator(".record-card").all()) {
    const street = await card
      .locator(".record-address")
      .evaluate((el) => el.firstChild?.textContent?.trim() ?? "");
    recorded.set(street, (await card.locator(".status-tag").innerText()).trim());
  }
  expect(recorded.size).toBeGreaterThan(0);

  await page.goto("/");
  const cards = page.locator(".gallery-card");
  expect(await cards.count()).toBeGreaterThan(0);
  for (const card of await cards.all()) {
    const street = (await card.locator(".gallery-street").innerText()).trim();
    const tag = (await card.locator(".status-tag").innerText()).trim();
    expect(tag, street).toBe(recorded.get(street));
  }
});
