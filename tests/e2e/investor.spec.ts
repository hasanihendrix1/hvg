import { test, expect, type Page } from "@playwright/test";
import {
  BUYER_CONSENT_TEXT,
  BUYER_DEAL_ALERTS_CONSENT_TEXT,
  BUYER_DEAL_UPDATES_CONSENT_TEXT,
  BUYER_LINE,
  BUYER_LINE_INVITES,
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
    live: true,
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
  await page.getByRole("checkbox", { name: /deal alerts about/ }).check();
  await page.getByRole("checkbox", { name: /updates on deals/ }).check();
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
    consentDealAlerts: true,
    consentDealUpdates: true,
  });
});

// The investor deal-texts opt-ins (src/data/consent.ts says why there are
// two): each optional, unchecked, the registered wording in full, and never
// needed to join.
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

const TEXT_BOXES = {
  consentDealAlerts: BUYER_DEAL_ALERTS_CONSENT_TEXT,
  consentDealUpdates: BUYER_DEAL_UPDATES_CONSENT_TEXT,
} as const;

test("both texting boxes are optional: unchecked, fully worded, and joining works with neither ticked", async ({
  page,
}) => {
  let payload: any = null;
  await page.route("**/.netlify/functions/newBuyer", async (route) => {
    payload = route.request().postDataJSON();
    await route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) });
  });
  await fillBuyer(page);
  for (const wording of Object.values(TEXT_BOXES)) {
    const box = page.getByRole("checkbox", { name: wording, exact: true });
    await expect(box).toBeVisible();
    await expect(box).not.toBeChecked();
  }
  // Calls-and-emails plus the two texting boxes, and nothing else.
  await expect(page.locator(".buyer-form").getByRole("checkbox")).toHaveCount(3);
  await page.getByRole("button", { name: "Join the buyer list" }).click();
  await expect(page.getByText("You're on the list")).toBeVisible();
  expect(payload.consentMarketing).toBe(true);
  expect(payload.consentDealAlerts).toBe(false);
  expect(payload.consentDealUpdates).toBe(false);
});

for (const [field, wording] of Object.entries(TEXT_BOXES)) {
  test(`ticking only the ${field} box sends a yes to that box alone`, async ({
    page,
  }) => {
    let payload: any = null;
    await page.route("**/.netlify/functions/newBuyer", async (route) => {
      payload = route.request().postDataJSON();
      await route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) });
    });
    await fillBuyer(page);
    await page.getByRole("checkbox", { name: wording, exact: true }).check();
    await page.getByRole("button", { name: "Join the buyer list" }).click();
    await expect(page.getByText("You're on the list")).toBeVisible();
    for (const other of Object.keys(TEXT_BOXES)) {
      expect(payload[other]).toBe(other === field);
    }
  });
}

test("/investor-text-consent shows all three boxes word for word, with the form screenshot", async ({
  page,
}) => {
  await page.goto("/investor-text-consent/");
  const quotes = page.locator(".consent-quote");
  for (const wording of [
    BUYER_CONSENT_TEXT,
    BUYER_DEAL_ALERTS_CONSENT_TEXT,
    BUYER_DEAL_UPDATES_CONSENT_TEXT,
  ]) {
    await expect(quotes.filter({ hasText: wording })).toHaveCount(1);
  }
  const shot = page.locator(".consent-shot img");
  await shot.scrollIntoViewIfNeeded();
  await expect
    .poll(() => shot.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
});

// The third door (dotato's "Agreed to deal texts" box on the buyer card), in
// the registration's message-flow words. It needs no buyer line.
test("/investor-text-consent describes the written-request door", async ({
  page,
}) => {
  await page.goto("/investor-text-consent/");
  const door = page.locator("section.legal");
  await expect(
    door.getByRole("heading", { name: /asking us in writing/ })
  ).toBeVisible();
  await expect(door).toContainText(
    "a text or email to us, or a signed buyer form"
  );
  await expect(door).toContainText(
    "A spoken request is never recorded as an opt-in."
  );
});

// The evidence page may say we invite DEALS on calls, voicemails and emails only
// once we do: until then the keyword door is the website line alone.
test("/investor-text-consent mentions call, voicemail and email invitations only once they are on", async ({
  page,
}) => {
  await page.goto("/investor-text-consent/");
  const page_ = page.locator("section.legal");
  const invites = [/at\s+the\s+end\s+of\s+our\s+calls/, /voicemail/i, /We\s+call\s+from\s+the\s+buyer\s+line/, /Tap\s+here\s+to\s+text\s+DEALS/, /one-to-one\s+emails/];
  for (const line of invites) {
    if (BUYER_LINE && BUYER_LINE_INVITES) await expect(page_).toContainText(line);
    else await expect(page_).not.toContainText(line);
  }
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

// A box ticked before hydration must be adopted as that box, never the other:
// a swap would record a yes the buyer never gave.
for (const [field, wording] of Object.entries(TEXT_BOXES)) {
  test(`ticking only the ${field} box before hydration sends a yes to that box alone`, async ({
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
    await page.getByRole("checkbox", { name: wording, exact: true }).check();
    await expect(page.locator("astro-island:has(.buyer-form)[ssr]")).toHaveCount(1);
    release();
    await page.locator("astro-island:has(.buyer-form):not([ssr])").waitFor();
    await page.getByRole("button", { name: "Join the buyer list" }).click();
    await expect(page.getByText("You're on the list")).toBeVisible();
    for (const other of Object.keys(TEXT_BOXES)) {
      expect(payload[other]).toBe(other === field);
    }
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
  expect(payload.consentDealAlerts).toBe(false);
  expect(payload.consentDealUpdates).toBe(false);
});

// DOT-512: a deal under contract shows its town and price; the address and
// photos go to the buyer list.
test("a live deal's card sends buyers to the list for the address and photos", async ({ page }) => {
  await page.goto("/investors/");
  const live = page.locator(".inv-card").filter({ hasText: "Bridge Rd" });
  await expect(live.getByRole("link", { name: "Join the buyer list for the address and photos" })).toHaveAttribute("href", "#buyer-list");
  const history = page.locator(".inv-card").filter({ hasText: "Arabian Woods" });
  await expect(history.getByRole("link", { name: /address and photos/ })).toHaveCount(0);
});
