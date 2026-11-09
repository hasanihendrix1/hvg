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

test("the calls-and-emails box is required before anything is sent", async ({
  page,
}) => {
  let posted = false;
  await page.route("**/.netlify/functions/newBuyer", async (route) => {
    posted = true;
    await route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) });
  });
  await page.goto("/investors/");
  await page.locator("astro-island:has(.buyer-form):not([ssr])").waitFor();
  await page.getByLabel("First name").fill("Playwright");
  await page.getByLabel("Last name").fill("Investor");
  await page.getByLabel("Mobile phone").fill("(404) 555-0142");
  await page.getByRole("textbox", { name: "Email" }).fill("pw@example.com");
  await page.getByRole("radio", { name: "Landlord" }).check();
  await page.getByRole("button", { name: "Join the buyer list" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Please check the box to agree to calls and emails."
  );
  expect(posted).toBe(false);
});

test("a number no US phone can have is caught on the form", async ({
  page,
}) => {
  let posted = false;
  await page.route("**/.netlify/functions/newBuyer", async (route) => {
    posted = true;
    await route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) });
  });
  await page.goto("/investors/");
  await page.locator("astro-island:has(.buyer-form):not([ssr])").waitFor();
  await page.getByLabel("First name").fill("Playwright");
  await page.getByLabel("Last name").fill("Investor");
  await page.getByLabel("Mobile phone").fill("(404) 155-0142");
  await page.getByRole("textbox", { name: "Email" }).fill("pw@example.com");
  await page.getByRole("radio", { name: "Landlord" }).check();
  await page.getByRole("checkbox", { name: /calls and emails/ }).check();
  await page.getByRole("button", { name: "Join the buyer list" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Please enter a valid phone number."
  );
  expect(posted).toBe(false);
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
  // Text typed before the island hydrates never reaches React state
  await page.locator("astro-island:has(.buyer-form):not([ssr])").waitFor();
  await page.getByLabel("First name").fill("Playwright");
  await page.getByLabel("Last name").fill("Investor");
  await page.getByLabel("Mobile phone").fill("(404) 555-0142");
  await page.getByRole("textbox", { name: "Email" }).fill("pw@example.com");
  await page.getByRole("radio", { name: "Landlord" }).check();
  await page.getByRole("checkbox", { name: /calls and emails/ }).check();
  await page.getByRole("button", { name: "Join the buyer list" }).click();
  await expect(page.getByText("You're on the list")).toBeVisible();
  expect(payload.number).toBe("(404) 555-0142"); // legacy field name
  expect(payload.consentMarketing).toBe(true);
});

test("hand-entered gaps and typos never reach a card", async ({ page }) => {
  await page.unroute("**/.netlify/functions/getDeals");
  await page.route("**/.netlify/functions/getDeals", (route) =>
    route.fulfill({
      status: 200,
      body: JSON.stringify([
        {
          _id: "gap-1",
          timestamp: "2026-Q4",
          price: null,
          status: "",
          address: "1 Gap St, Atlanta, GA 30310",
          bedrooms: 3,
          bathrooms: -2,
          sqft: 1154,
          image: null,
        },
      ]),
    })
  );
  await page.goto("/investors/");
  const card = page.locator(".inv-card", { hasText: "1 Gap St" });
  await expect(card).toBeVisible();
  await expect(card.locator(".inv-details")).toHaveText("3 beds · 1,154 sq ft");
  await expect(card).not.toContainText("$0");
  await expect(card.locator(".inv-status")).toHaveCount(0);
});

test("what a buyer types before the form hydrates is still submitted", async ({
  page,
}) => {
  let release!: () => void;
  const held = new Promise<void>((r) => (release = r));
  await page.route("**/_astro/BuyerSignup*.js", async (route) => {
    await held;
    await route.continue();
  });
  let payload: any = null;
  await page.route("**/.netlify/functions/newBuyer", async (route) => {
    payload = route.request().postDataJSON();
    await route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) });
  });
  await page.goto("/investors/", { waitUntil: "domcontentloaded" });
  await page.getByLabel("First name").fill("Early");
  await page.getByLabel("Last name").fill("Typist");
  await page.getByLabel("Mobile phone").fill("(404) 555-0142");
  await page.getByRole("textbox", { name: "Email" }).fill("early@example.com");
  await page.getByRole("radio", { name: "Both" }).check();
  await page.getByRole("checkbox", { name: /calls and emails/ }).check();
  await expect(
    page.locator("astro-island:has(.buyer-form)[ssr]")
  ).toHaveCount(1);
  release();
  await page.locator("astro-island:has(.buyer-form):not([ssr])").waitFor();
  await page.getByRole("button", { name: "Join the buyer list" }).click();
  await expect(page.getByText("You're on the list")).toBeVisible();
  expect(payload).toMatchObject({
    firstName: "Early",
    lastName: "Typist",
    number: "(404) 555-0142",
    email: "early@example.com",
    buyerType: "Both",
    consentMarketing: true,
  });
});
