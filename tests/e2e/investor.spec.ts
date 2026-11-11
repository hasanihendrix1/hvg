import { test, expect, type Page } from "@playwright/test";
import {
  BUYER_CONSENT_TEXT,
  BUYER_LINE,
  BUYER_TEXT_CONSENT_TEXT,
} from "../../src/data/consent";

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
  await page.getByRole("checkbox", { name: /recurring text messages/ }).check();
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
    consentTexts: true,
  });
});

// The investor deal-texts opt-in (A2P 10DLC): optional, unchecked, the
// registered wording in full, and never needed to join.
const fillBuyer = async (page: Page) => {
  await page.goto("/investors/");
  await page.locator("astro-island:has(.buyer-form):not([ssr])").waitFor();
  await page.getByLabel("First name").fill("Playwright");
  await page.getByLabel("Last name").fill("Investor");
  await page.getByLabel("Mobile phone").fill("(404) 555-0142");
  await page.getByRole("textbox", { name: "Email" }).fill("pw@example.com");
  await page.getByRole("radio", { name: "Landlord" }).check();
  await page.getByRole("checkbox", { name: /calls and emails/ }).check();
};

test("the texting box is optional: unchecked, fully worded, and joining works without it", async ({
  page,
}) => {
  let payload: any = null;
  await page.route("**/.netlify/functions/newBuyer", async (route) => {
    payload = route.request().postDataJSON();
    await route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) });
  });
  await fillBuyer(page);
  const textBox = page.getByRole("checkbox", {
    name: BUYER_TEXT_CONSENT_TEXT,
    exact: true,
  });
  await expect(textBox).toBeVisible();
  await expect(textBox).not.toBeChecked();
  await page.getByRole("button", { name: "Join the buyer list" }).click();
  await expect(page.getByText("You're on the list")).toBeVisible();
  expect(payload.consentMarketing).toBe(true);
  expect(payload.consentTexts).toBe(false);
});

test("ticking the texting box sends a yes to texts", async ({ page }) => {
  let payload: any = null;
  await page.route("**/.netlify/functions/newBuyer", async (route) => {
    payload = route.request().postDataJSON();
    await route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) });
  });
  await fillBuyer(page);
  await page
    .getByRole("checkbox", { name: BUYER_TEXT_CONSENT_TEXT, exact: true })
    .check();
  await page.getByRole("button", { name: "Join the buyer list" }).click();
  await expect(page.getByText("You're on the list")).toBeVisible();
  expect(payload.consentTexts).toBe(true);
});

test("/investor-text-consent shows both boxes word for word, with the form screenshot", async ({
  page,
}) => {
  await page.goto("/investor-text-consent/");
  const quotes = page.locator(".consent-quote");
  await expect(quotes.filter({ hasText: BUYER_CONSENT_TEXT })).toHaveCount(1);
  await expect(quotes.filter({ hasText: BUYER_TEXT_CONSENT_TEXT })).toHaveCount(1);
  const shot = page.locator(".consent-shot img");
  await shot.scrollIntoViewIfNeeded();
  await expect
    .poll(() => shot.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
});

// Until the buyer line is bought, no page may invite anyone to text DEALS.
const DEALS_PAGES = [
  "/investors/",
  "/investor-text-consent/",
  "/investor-sms-terms/",
  "/investor-privacy/",
];
for (const path of DEALS_PAGES) {
  test(`the DEALS keyword on ${path} follows the buyer line constant`, async ({
    page,
  }) => {
    await page.goto(path);
    await page.locator("main").waitFor();
    if (!BUYER_LINE) {
      await expect(page.locator("main")).not.toContainText("DEALS");
      return;
    }
    await expect(page.locator("main")).toContainText(BUYER_LINE.display);
    await expect(
      page.locator(`main a[href="${BUYER_LINE.sms}"]`).first()
    ).toBeVisible();
  });
}

// Two A2P 10DLC campaigns, each reviewed against its own pages: the buyer
// pages link only investor legal pages, and the homeowner campaign's pages
// carry nothing of the investor program but one pointer line.
const SELLER_LEGAL = ["/privacy", "/sms-terms", "/text-consent", "/get-offer"];
const linksIn = (page: Page, selector: string) =>
  page
    .locator(`${selector} a[href]`)
    .evaluateAll((as: HTMLAnchorElement[]) =>
      as.map((a) => new URL(a.href).pathname.replace(/\/$/, ""))
    );

for (const path of DEALS_PAGES) {
  test(`${path} links no homeowner legal page`, async ({ page }) => {
    await page.goto(path);
    const content = await linksIn(page, "main");
    expect(
      content.some((p) => ["/investor-sms-terms", "/investor-privacy"].includes(p))
    ).toBe(true);
    // The whole page: header, content, footer and the mobile bar.
    const everywhere = await linksIn(page, "body");
    for (const seller of SELLER_LEGAL) expect(everywhere).not.toContain(seller);
  });
}

for (const path of ["/privacy/", "/sms-terms/", "/text-consent/", "/get-offer/"]) {
  test(`${path} carries no investor program content`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("main")).not.toContainText("DEALS");
    const investorLinks = (await linksIn(page, "main")).filter((p) =>
      p.startsWith("/investor-")
    );
    const pointer = ["/privacy/", "/sms-terms/"].includes(path)
      ? ["/investor-sms-terms"]
      : [];
    expect(investorLinks).toEqual(pointer);
    const legal = await linksIn(page, 'footer nav[aria-label="Legal"]');
    expect(legal.filter((p) => p.startsWith("/investor-"))).toEqual([]);
  });
}

test("ticking only the calls box before hydration is never read as a yes to texts", async ({
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
  release();
  await page.locator("astro-island:has(.buyer-form):not([ssr])").waitFor();
  await page.getByRole("button", { name: "Join the buyer list" }).click();
  await expect(page.getByText("You're on the list")).toBeVisible();
  expect(payload.consentMarketing).toBe(true);
  expect(payload.consentTexts).toBe(false);
});
