import { test, expect } from "@playwright/test";

const MOCK_DEALS = [
  {
    _id: "bridge-1",
    timestamp: "2026-Q3",
    price: "199000",
    status: "Available",
    address: "789 Bridge Rd, Decatur, GA 30032",
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1400,
    image: null,
  },
  {
    _id: "s1",
    timestamp: "2021-Q1",
    price: "114500",
    status: "Sold",
    address: "3002 Arabian Woods Dr, Lithonia, GA 30038",
    bedrooms: 5,
    bathrooms: 2,
    sqft: 1770,
    image: null,
  },
];

test.beforeEach(async ({ page }) => {
  await page.route("**/.netlify/functions/getDeals", (route) =>
    route.fulfill({ status: 200, body: JSON.stringify(MOCK_DEALS) })
  );
  await page.route("**/.netlify/functions/track-event", (route) =>
    route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) })
  );
});

test("inventory renders with data-derived status filter", async ({ page }) => {
  await page.goto("/investors/");
  await expect(page.locator(".inv-card")).toHaveCount(3); // 2 deals + join card
  const options = await page
    .locator("#inv-status option")
    .allTextContents();
  expect(options).toEqual(["All statuses", "Available", "Sold"]);
  await page.locator("#inv-status").selectOption("Available");
  await expect(page.locator(".inv-address")).toHaveCount(1);
  await expect(page.locator(".inv-address")).toContainText("Bridge Rd");
});

test("the first-look card guides to the signup form", async ({ page }) => {
  await page.goto("/investors/");
  await page
    .locator(".inv-join-card")
    .getByRole("link", { name: "Join the buyer list" })
    .click();
  await expect(page.locator("#buyer-list")).toBeInViewport();
});

test("buyer signup validates and submits the legacy-compatible payload", async ({
  page,
}) => {
  let payload: any = null;
  await page.route("**/.netlify/functions/newBuyer", async (route) => {
    payload = route.request().postDataJSON();
    await route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) });
  });
  await page.goto("/investors/");
  await page.getByLabel("First name").fill("Playwright");
  await page.getByLabel("Last name").fill("Investor");
  await page.getByLabel("Mobile phone").fill("(404) 555-0142");
  await page.getByRole("textbox", { name: "Email" }).fill("pw@example.com");
  await page.getByRole("radio", { name: "Landlord" }).check();
  await page.getByRole("button", { name: "Join the buyer list" }).click();
  await expect(page.getByText("You're on the list")).toBeVisible();
  expect(payload.number).toBe("(404) 555-0142"); // legacy field name
  expect(payload.consentMarketing).toBe(false);
});
