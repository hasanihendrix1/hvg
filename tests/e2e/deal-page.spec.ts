import { test, expect, type Page, type Request } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
// The production renderer over the built shell: what /deals/<slug> serves.
import { renderDealPage } from "../../netlify/functions/deal-page.js";

const SLUG = "sample-dr-k3m9q2x7wzpa";
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);

const CONTENT = {
  street: "1234 Sample Dr SE",
  locality: "Atlanta, GA 30316",
  facts: "Single Family · 3 bed · 2 bath · 1,320 sqft · built 1958",
  occupancy: "Delivered Vacant",
  price: { label: "Suggested Price", amount: 165000 },
  arv: 295000,
  about: "Brick ranch on a corner lot.",
  mustRead: [],
  terms: [
    "We hold this house under a purchase contract and are offering to assign that contract.",
    "Earnest money: $3,000, non-refundable, due to the closing attorney by noon the next business day after signing.",
    "Close on or before Sat, Dec 12.",
  ],
  disclaimer: "Hendrix Ventures Group LLC is a real estate investor, not a licensed broker or agent.",
  heroUrl: "https://ltpiqfgtfdzlgtqdghle.supabase.co/storage/v1/object/public/deal-photos/s/front.jpg",
  photos: Array.from({ length: 10 }, (_, i) => ({ id: `driveFileId${String(i).padStart(4, "0")}`, name: `Room ${i + 1}.jpg` })),
  photosFolderUrl: "https://drive.google.com/drive/folders/sample",
  phone: "+14705550123",
  deposit: 3000,
  closeBy: "2026-12-12",
};

// A walkthrough a year out, so the RSVP is open whenever this runs.
const AHEAD = { at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), label: "Sat, Nov 21 · 10:00 AM" };

type Served = { posts: Record<string, unknown>[] };

async function serve(
  page: Page,
  state: Record<string, unknown>,
  opts: { thumbnails?: "ok" | "broken" | { broken: string }; respond?: (n: number) => number } = {}
): Promise<Served> {
  const served: Served = { posts: [] };
  const shell = await (await page.request.get("/deals/shell/")).text();
  await page.route(`**/deals/${SLUG}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: renderDealPage({ shell, page: state, url: `https://hendrixventures.com/deals/${SLUG}` }),
    })
  );
  await page.route("**/drive.google.com/thumbnail**", (route) => {
    const t = opts.thumbnails;
    const broken = t === "broken" || (typeof t === "object" && route.request().url().includes(`id=${t.broken}&`));
    return broken ? route.abort() : route.fulfill({ status: 200, contentType: "image/png", body: PNG });
  });
  await page.route("**/storage/v1/object/public/**", (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: PNG })
  );
  await page.route("**/.netlify/functions/track-event", (route) => route.fulfill({ status: 200, body: "{}" }));
  await page.route("**/.netlify/functions/dealResponse", async (route) => {
    served.posts.push(JSON.parse(route.request().postData() ?? "{}"));
    const status = opts.respond ? opts.respond(served.posts.length) : 200;
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ ok: status === 200 }) });
  });
  return served;
}

const live = (content: Record<string, unknown> = CONTENT) => ({ state: "live", slug: SLUG, content });

async function fillContact(page: Page) {
  await page.getByLabel("First name").fill("Dana");
  await page.getByLabel("Last name").fill("Buyer");
  await page.getByLabel("Mobile phone").fill("(404) 555-0142");
  await page.getByLabel("Email", { exact: true }).fill("dana@example.com");
  await page.getByRole("checkbox", { name: /calls and emails/ }).check();
}

async function expectAxeClean(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""));
  expect(blocking, blocking.map((v) => `${v.id}: ${v.help}`).join("\n")).toEqual([]);
}

test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("a live deal shows its facts, price, terms and photos, and never an ARV", async ({ page }) => {
    await serve(page, live());
    await page.goto(`/deals/${SLUG}`);
    await expect(page.getByRole("heading", { level: 1, name: "1234 Sample Dr SE" })).toBeVisible();
    await expect(page.getByText("Off-market · Atlanta, GA 30316")).toBeVisible();
    await expect(page.getByText("Delivered Vacant")).toBeVisible();
    const card = page.locator(".deal-price-card");
    await expect(card.getByText("Suggested Price")).toBeVisible();
    await expect(card.getByText("$165,000")).toBeVisible();
    await expect(card.getByText("Earnest money")).toBeVisible();
    await expect(card.getByText("$3,000")).toBeVisible();
    // Read from the date itself: Dec 12, 2026 is a Saturday
    await expect(card.getByText("Sat, Dec 12")).toBeVisible();
    // The content carries an ARV; the page shows none (owner, 2026-11-14), in its text or its source
    await expect(page.getByText(/ARV|after-repair/i)).toHaveCount(0);
    expect(await page.content()).not.toContain("295000");
    await expect(page.locator(".deal-tile")).toHaveCount(8);
    await page.getByRole("button", { name: "See all 10 photos" }).click();
    await expect(page.locator(".deal-tile")).toHaveCount(10);
    await expect(page.getByRole("link", { name: /Photos and video folder/ })).toHaveAttribute("href", CONTENT.photosFolderUrl);
    await expect(page.getByText("Close on or before Sat, Dec 12.")).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expectAxeClean(page);
  });

  test("a deal with no earnest money or close-by date shows the price alone", async ({ page }) => {
    await serve(page, live({ ...CONTENT, deposit: null, closeBy: null }));
    await page.goto(`/deals/${SLUG}`);
    const card = page.locator(".deal-price-card");
    await expect(card.getByText("$165,000")).toBeVisible();
    await expect(card.getByText("Earnest money")).toHaveCount(0);
    await expect(card.getByText("Close by")).toHaveCount(0);
    await expect(card.getByRole("button", { name: /Submit an offer/ })).toBeVisible();
  });

  test("an agent deal reads Buy Now", async ({ page }) => {
    await serve(page, live({ ...CONTENT, price: { label: "Buy Now", amount: 150000 } }));
    await page.goto(`/deals/${SLUG}`);
    await expect(page.locator(".deal-price-card").getByText("Buy Now")).toBeVisible();
  });

  test("a site-unseen offer cannot be sent until the buyer acknowledges it", async ({ page }) => {
    const served = await serve(page, live());
    await page.goto(`/deals/${SLUG}`);
    await page.locator(".deal-price-card").getByRole("button", { name: "Submit an offer" }).click();

    await expect(page.getByRole("heading", { name: "Is this offer site unseen?" })).toBeVisible();
    const unseen = page.getByRole("button", { name: /^Site unseen/ });
    const walk = page.getByRole("button", { name: /^I've done the walkthrough/ });
    await expect(unseen).toHaveAttribute("aria-pressed", "false");
    await expect(walk).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
    await unseen.click();
    await expect(unseen).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByLabel("Offer price").fill("158000");
    await expect(page.getByLabel("Earnest money ($)")).toHaveValue("3,000");
    await expect(page.getByLabel("Close by")).toHaveValue("2026-12-12");
    await fillContact(page);
    await page.getByRole("button", { name: "Review offer" }).click();

    await expect(page.locator(".deal-review-price")).toHaveText("$158,000");
    await expect(page.locator(".deal-review-choice")).toHaveText("Site unseen");
    const send = page.getByRole("button", { name: "Send offer" });
    await expect(send).toBeDisabled();
    await expectAxeClean(page);
    await page.getByRole("checkbox", { name: "I'm buying without seeing the inside." }).check();
    await send.click();

    await expect(page.getByRole("heading", { name: "Offer sent" })).toBeVisible();
    await expect(page.getByText("Your site-unseen offer of $158,000 on 1234 Sample Dr SE is in.")).toBeVisible();
    expect(served.posts).toHaveLength(1);
    const body = served.posts[0];
    expect(body).toMatchObject({
      slug: SLUG,
      kind: "offer",
      firstName: "Dana",
      consentCallsEmail: true,
      offer: { siteUnseen: true, acknowledgedUnseen: true, amount: 158000, emd: 3000, closeBy: "2026-12-12", notes: null },
    });
    expect(body.submissionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(body).not.toHaveProperty("consentDealAlerts");
    expect(body.fillTimeMs).toBeGreaterThan(0);
  });

  test("the form's fill time counts from the page, not from the last screen", async ({ page }) => {
    const served = await serve(page, live());
    await page.goto(`/deals/${SLUG}`);
    await page.locator(".deal-price-card").getByRole("button", { name: "Submit an offer" }).click();
    await page.getByRole("button", { name: /^I've done the walkthrough/ }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Offer price").fill("150000");
    await fillContact(page);
    await page.waitForTimeout(2500);
    await page.getByRole("button", { name: "Review offer" }).click();
    await page.getByRole("button", { name: "Send offer" }).click();
    await expect(page.getByRole("heading", { name: "Offer sent" })).toBeVisible();
    expect(served.posts[0].fillTimeMs).toBeGreaterThanOrEqual(2500);
  });

  test("Back after sending and sending again is the same submission", async ({ page }) => {
    const served = await serve(page, live());
    await page.goto(`/deals/${SLUG}`);
    await page.locator(".deal-price-card").getByRole("button", { name: "Submit an offer" }).click();
    await page.getByRole("button", { name: /^I've done the walkthrough/ }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Offer price").fill("150000");
    await fillContact(page);
    await page.getByRole("button", { name: "Review offer" }).click();
    await page.getByRole("button", { name: "Send offer" }).click();
    await expect(page.getByRole("heading", { name: "Offer sent" })).toBeVisible();
    await page.goBack();
    await page.getByRole("button", { name: "Send offer" }).click();
    await expect(page.getByRole("heading", { name: "Offer sent" })).toBeVisible();
    expect(served.posts).toHaveLength(2);
    expect(served.posts[1].submissionId).toBe(served.posts[0].submissionId);
  });

  test("a changed offer sent after Back is a new submission", async ({ page }) => {
    const served = await serve(page, live());
    await page.goto(`/deals/${SLUG}`);
    await page.locator(".deal-price-card").getByRole("button", { name: "Submit an offer" }).click();
    await page.getByRole("button", { name: /^I've done the walkthrough/ }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Offer price").fill("150000");
    await fillContact(page);
    await page.getByRole("button", { name: "Review offer" }).click();
    await page.getByRole("button", { name: "Send offer" }).click();
    await expect(page.getByRole("heading", { name: "Offer sent" })).toBeVisible();
    await page.goBack();
    await page.goBack();
    await page.getByLabel("Offer price").fill("160000");
    await page.getByRole("button", { name: "Review offer" }).click();
    await page.getByRole("button", { name: "Send offer" }).click();
    await expect(page.getByRole("heading", { name: "Offer sent" })).toBeVisible();
    expect(served.posts.map((p) => (p.offer as { amount: number }).amount)).toEqual([150000, 160000]);
    expect(served.posts[1].submissionId).not.toBe(served.posts[0].submissionId);
  });

  test("cents are cents, and a price the website would refuse is caught on the form", async ({ page }) => {
    const served = await serve(page, live());
    await page.goto(`/deals/${SLUG}`);
    await page.locator(".deal-price-card").getByRole("button", { name: "Submit an offer" }).click();
    await page.getByRole("button", { name: /^I've done the walkthrough/ }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await fillContact(page);
    await page.getByLabel("Offer price").fill("$158,000.00");
    await page.getByLabel("Earnest money ($)").fill("3k");
    await page.getByRole("button", { name: "Review offer" }).click();
    await expect(page.getByRole("alert")).toHaveText("Please enter the earnest money in dollars.");
    await page.getByLabel("Earnest money ($)").fill("9,000,000");
    await page.getByRole("button", { name: "Review offer" }).click();
    await expect(page.getByRole("alert")).toHaveText("Earnest money can be at most $5,000,000.");
    await page.getByLabel("Earnest money ($)").fill("3,000");
    await page.getByRole("button", { name: "Review offer" }).click();
    await expect(page.locator(".deal-review-price")).toHaveText("$158,000");
    await page.getByRole("button", { name: "Send offer" }).click();
    expect(served.posts[0].offer).toMatchObject({ amount: 158000, emd: 3000 });
  });

  test("an offer after a walkthrough needs no acknowledgment", async ({ page }) => {
    const served = await serve(page, live());
    await page.goto(`/deals/${SLUG}`);
    await page.locator(".deal-price-card").getByRole("button", { name: "Submit an offer" }).click();
    await page.getByRole("button", { name: /^I've done the walkthrough/ }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Offer price").fill("$150,000");
    await fillContact(page);
    await page.getByRole("button", { name: "Review offer" }).click();
    await expect(page.locator(".deal-review-choice")).toHaveText("Walkthrough done");
    await expect(page.getByRole("checkbox", { name: /without seeing the inside/ })).toHaveCount(0);
    await page.getByRole("button", { name: "Send offer" }).click();
    await expect(page.getByText("Your offer of $150,000 on 1234 Sample Dr SE is in.")).toBeVisible();
    await expect(page.getByText(/becomes final/)).toHaveCount(0);
    expect(served.posts[0].offer).toMatchObject({ siteUnseen: false, acknowledgedUnseen: false, amount: 150000 });
  });

  test("the back button steps back through the offer and keeps the answer", async ({ page }) => {
    await serve(page, live());
    await page.goto(`/deals/${SLUG}`);
    await page.locator(".deal-price-card").getByRole("button", { name: "Submit an offer" }).click();
    await page.getByRole("button", { name: /^Site unseen/ }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Offer price").fill("158000");
    await page.goBack();
    await expect(page.getByRole("button", { name: /^Site unseen/ })).toHaveAttribute("aria-pressed", "true");
    await page.goBack();
    await expect(page.getByRole("heading", { level: 1, name: "1234 Sample Dr SE" })).toBeVisible();
    await page.goForward();
    await page.goForward();
    await expect(page.getByLabel("Offer price")).toHaveValue("158000");
  });

  test("I'm interested asks for the calls-and-emails yes, then sends", async ({ page }) => {
    const served = await serve(page, live());
    await page.goto(`/deals/${SLUG}`);
    await page.locator(".deal-price-card").getByRole("button", { name: "I'm interested" }).click();
    await page.getByLabel("First name").fill("Dana");
    await page.getByLabel("Last name").fill("Buyer");
    await page.getByLabel("Mobile phone").fill("(404) 555-0142");
    await page.getByLabel("Email", { exact: true }).fill("dana@example.com");
    await page.getByRole("checkbox", { name: /updates on deals I respond to/ }).check();
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByRole("alert")).toHaveText("Please check the box to agree to calls and emails.");
    expect(served.posts).toHaveLength(0);
    await page.getByRole("checkbox", { name: /calls and emails/ }).check();
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByRole("heading", { name: "Got it" })).toBeVisible();
    expect(served.posts[0]).toMatchObject({ kind: "interested", offer: null, consentDealUpdates: true });
  });

  test("the deal page's forms ask for two yeses: calls and emails, and updates on this deal", async ({ page }) => {
    await serve(page, live({ ...CONTENT, walkthrough: AHEAD }));
    for (const open of ["I'm interested", "RSVP for the walkthrough"]) {
      await page.goto(`/deals/${SLUG}`);
      await page.locator(".deal-price-card").getByRole("button", { name: open }).first().click();
      await expect(page.getByRole("checkbox")).toHaveCount(2);
      await expect(page.getByRole("checkbox", { name: /calls and emails/ })).toBeVisible();
      await expect(page.getByRole("checkbox", { name: /updates on deals I respond to/ })).toBeVisible();
      await expect(page.getByText(/deal alerts/i)).toHaveCount(0);
    }
  });

  test("a failed send says so with the number, and the retry is the same submission", async ({ page }) => {
    const served = await serve(page, live(), { respond: (n) => (n === 1 ? 502 : 200) });
    await page.goto(`/deals/${SLUG}`);
    await page.locator(".deal-price-card").getByRole("button", { name: "I'm interested" }).click();
    await fillContact(page);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByRole("alert")).toHaveText("That didn't go through. Try again, or call or text (470) 555-0123.");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByRole("heading", { name: "Got it" })).toBeVisible();
    expect(served.posts).toHaveLength(2);
    expect(served.posts[1].submissionId).toBe(served.posts[0].submissionId);
  });

  test("interest sent again with a different email is a new submission", async ({ page }) => {
    const served = await serve(page, live());
    await page.goto(`/deals/${SLUG}`);
    await page.locator(".deal-price-card").getByRole("button", { name: "I'm interested" }).click();
    await fillContact(page);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByRole("heading", { name: "Got it" })).toBeVisible();
    await page.goBack();
    await page.getByLabel("Email", { exact: true }).fill("dana.buyer@example.com");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByRole("heading", { name: "Got it" })).toBeVisible();
    expect(served.posts.map((p) => p.email)).toEqual(["dana@example.com", "dana.buyer@example.com"]);
    expect(served.posts[1].submissionId).not.toBe(served.posts[0].submissionId);
  });

  test("a deal that went Pending while the form was open says it is no longer available", async ({ page }) => {
    await serve(page, live(), { respond: () => 410 });
    await page.goto(`/deals/${SLUG}`);
    await page.locator(".deal-price-card").getByRole("button", { name: "I'm interested" }).click();
    await fillContact(page);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByRole("heading", { name: "This deal is no longer available" })).toBeVisible();
  });

  test("Drive photos that will not load fall back to the folder link", async ({ page }) => {
    await serve(page, live(), { thumbnails: "broken" });
    await page.goto(`/deals/${SLUG}`);
    await expect(page.getByRole("link", { name: /See the photos and video/ })).toBeVisible();
    await expect(page.locator(".deal-tile")).toHaveCount(0);
  });

  test("one Drive photo that will not load drops out on its own", async ({ page }) => {
    await serve(page, live(), { thumbnails: { broken: "driveFileId0003" } });
    await page.goto(`/deals/${SLUG}`);
    await page.locator(".deal-gallery").scrollIntoViewIfNeeded();
    await expect(page.locator(".deal-count")).toHaveText("9 photos");
    await expect(page.getByRole("button", { name: /Room 4/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Room 5/ })).toBeVisible();
  });

  test("a Pending or closed deal shows only that it is no longer available", async ({ page }) => {
    await serve(page, { state: "unavailable" });
    await page.goto(`/deals/${SLUG}`);
    await expect(page.getByRole("heading", { name: "This deal is no longer available" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Join the buyer list" }).first()).toHaveAttribute("href", "/investors#buyer-list");
    await expect(page.getByText("Sample Dr")).toHaveCount(0);
    await expectAxeClean(page);
  });

  test("a walkthrough still ahead shows its one time, and the RSVP sends who is coming", async ({ page }) => {
    const served = await serve(page, live({ ...CONTENT, walkthrough: AHEAD }));
    await page.goto(`/deals/${SLUG}`);
    const walk = page.getByTestId("deal-walk");
    // The stub shows the date, the line beside it the time; the name reads the whole of it
    await expect(walk).toHaveAccessibleName(/^RSVP for the walkthrough Sat, Nov 21, 10:00 AM · one walkthrough for everyone/);
    await expect(walk).toContainText("Nov");
    await expect(walk).toContainText("21");
    await expectAxeClean(page);
    await walk.click();

    await expect(page.getByRole("heading", { name: "RSVP for the walkthrough" })).toBeFocused();
    await expect(page.locator(".deal-walk-flow")).toContainText(AHEAD.label);
    await fillContact(page);
    await page.getByRole("checkbox", { name: /updates on deals I respond to/ }).check();
    await page.getByRole("button", { name: "Add a guest" }).click();
    await page.getByLabel("Guest 1 name").fill("Sam Roofer");
    await page.getByRole("button", { name: "Add another guest" }).click();
    await expectAxeClean(page);
    // A line added and left empty is not a guest.
    await page.getByLabel("Anything we should know?").fill("Bringing my contractor");
    await page.getByRole("button", { name: "Send RSVP" }).click();

    await expect(page.getByRole("heading", { name: "You're on the list" })).toBeVisible();
    await expect(page.getByText(`See you at 1234 Sample Dr SE on ${AHEAD.label}, with 1 guest.`)).toBeVisible();
    expect(served.posts).toHaveLength(1);
    expect(served.posts[0]).toMatchObject({
      kind: "rsvp",
      offer: null,
      consentDealUpdates: true,
      rsvp: { slotAt: AHEAD.at, guests: [{ name: "Sam Roofer", phone: null }], note: "Bringing my contractor" },
    });
  });

  test("a guest line with a phone and no name is caught on the form, and at most four come along", async ({ page }) => {
    const served = await serve(page, live({ ...CONTENT, walkthrough: AHEAD }));
    await page.goto(`/deals/${SLUG}`);
    await page.getByTestId("deal-walk").click();
    await fillContact(page);
    await page.getByRole("button", { name: "Add a guest" }).click();
    await page.getByLabel("Guest 1 phone").fill("404-555-0199");
    await page.getByRole("button", { name: "Send RSVP" }).click();
    await expect(page.getByRole("alert")).toContainText("add a name for each person");
    expect(served.posts).toHaveLength(0);
    for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Add another guest" }).click();
    await expect(page.getByRole("button", { name: "Add another guest" })).toHaveCount(0);
  });

  test("no walkthrough, or one already started, offers no RSVP", async ({ page }) => {
    await serve(page, live());
    await page.goto(`/deals/${SLUG}`);
    await expect(page.getByRole("heading", { name: "1234 Sample Dr SE" })).toBeVisible();
    await expect(page.getByTestId("deal-walk")).toHaveCount(0);
    await serve(page, live({ ...CONTENT, walkthrough: { at: "2020-01-04T15:00:00.000Z", label: "Sat, Jan 4 · 10:00 AM" } }));
    await page.goto(`/deals/${SLUG}`);
    await expect(page.getByRole("heading", { name: "1234 Sample Dr SE" })).toBeVisible();
    await expect(page.getByTestId("deal-walk")).toHaveCount(0);
  });

  test("a walkthrough that moved while the form was open asks for a reload, never a wrong RSVP", async ({ page }) => {
    await serve(page, live({ ...CONTENT, walkthrough: AHEAD }), { respond: () => 409 });
    await page.goto(`/deals/${SLUG}`);
    await page.getByTestId("deal-walk").click();
    await fillContact(page);
    await page.getByRole("button", { name: "Send RSVP" }).click();
    await expect(page.getByRole("alert")).toHaveText("The walkthrough time has changed. Reload this page to see the new time.");
    await expect(page.getByRole("heading", { name: "You're on the list" })).toHaveCount(0);
  });

  test("an offer carries its due diligence days, and a bad number is caught on the form", async ({ page }) => {
    const served = await serve(page, live());
    await page.goto(`/deals/${SLUG}`);
    await page.locator(".deal-price-card").getByRole("button", { name: "Submit an offer" }).click();
    await page.getByRole("button", { name: /^I've done the walkthrough/ }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Offer price").fill("$150,000");
    await fillContact(page);
    await page.getByLabel("Due diligence days").fill("two weeks");
    await page.getByRole("button", { name: "Review offer" }).click();
    await expect(page.getByRole("alert")).toContainText("due diligence as a number of days");
    await page.getByLabel("Due diligence days").fill("10");
    await page.getByRole("button", { name: "Review offer" }).click();
    await expect(page.locator(".deal-review-rows")).toContainText("Due diligence");
    await expect(page.locator(".deal-review-rows")).toContainText("10 days");
    await page.getByRole("button", { name: "Send offer" }).click();
    await expect(page.getByText("Your offer of $150,000 on 1234 Sample Dr SE is in.")).toBeVisible();
    await expect(page.getByText(/becomes final/)).toHaveCount(0);
    expect(served.posts[0].offer).toMatchObject({ amount: 150000, ddDays: 10 });
  });

  test("with a walkthrough set, I'm interested moves under the keys and still opens its form", async ({ page }) => {
    await serve(page, live({ ...CONTENT, walkthrough: AHEAD }));
    await page.goto(`/deals/${SLUG}`);
    const card = page.locator(".deal-price-card");
    await expect(card.getByRole("button", { name: /RSVP for the walkthrough/ })).toBeVisible();
    await card.getByRole("button", { name: "I'm interested", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Interested in this house?" })).toBeFocused();
  });

  test("a walkthrough three days out counts down on its ticket, by calendar day", async ({ page }) => {
    // 9 AM Eastern on Wed, Nov 18: the walkthrough is Sat, Nov 21 at 10 AM Eastern
    await page.clock.setFixedTime(new Date("2026-11-18T14:00:00.000Z"));
    await serve(page, live({ ...CONTENT, walkthrough: { at: "2026-11-21T15:00:00.000Z", label: "Sat, Nov 21 · 10:00 AM" } }));
    await page.goto(`/deals/${SLUG}`);
    await expect(page.getByTestId("deal-walk").locator(".deal-chip")).toHaveText("In 3 days");
  });

  test("the keys' press motion is parked under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await serve(page, live({ ...CONTENT, walkthrough: AHEAD }));
    await page.goto(`/deals/${SLUG}`);
    const offer = page.locator(".deal-key-offer");
    await offer.hover();
    expect(await offer.evaluate((el) => getComputedStyle(el).transform)).toBe("none");
    expect(await page.locator(".deal-price-card").evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  });

  test("the shell opened directly is unindexed and shows no deal", async ({ page }) => {
    await page.route("**/.netlify/functions/track-event", (route) => route.fulfill({ status: 200, body: "{}" }));
    const posted: Request[] = [];
    page.on("request", (r) => {
      if (r.url().includes("track-event")) posted.push(r);
    });
    await page.goto("/deals/shell/");
    await expect(page.getByRole("heading", { name: "This deal is no longer available" })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect.poll(() => posted.length).toBeGreaterThan(0);
    expect(JSON.parse(posted[0].postData() ?? "{}").path).toBe("/deals/[link]");
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("both keys are on the first screen, and the bar takes over only once one scrolls away", async ({ page }) => {
    await serve(page, live({ ...CONTENT, walkthrough: AHEAD }));
    await page.goto(`/deals/${SLUG}`);
    const viewport = page.viewportSize()!;
    for (const key of [page.locator(".deal-key-offer"), page.getByTestId("deal-walk")]) {
      const box = (await key.boundingBox())!;
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    }
    const bar = page.getByRole("region", { name: "Respond to this deal" });
    await expect(bar).toBeHidden();
    await page.getByRole("heading", { name: "Terms" }).scrollIntoViewIfNeeded();
    await expect(bar).toBeVisible();
    await expect(bar.getByRole("button", { name: /RSVP/ })).toContainText(AHEAD.label);
    await bar.getByRole("button", { name: /RSVP/ }).click();
    await expect(page.getByRole("heading", { name: "RSVP for the walkthrough" })).toBeFocused();
  });

  test("the two actions stay pinned, the site's own bar is gone, and nothing scrolls sideways", async ({ page }) => {
    await serve(page, live());
    await page.goto(`/deals/${SLUG}`);
    const bar = page.getByRole("region", { name: "Respond to this deal" });
    await page.getByRole("heading", { name: "Terms" }).scrollIntoViewIfNeeded();
    await expect(bar).toBeVisible();
    await expect(bar.getByRole("button", { name: "Submit offer" })).toBeVisible();
    await expect(page.locator(".sticky-bar")).toHaveCount(0);
    const overflow = await page.evaluate(() => document.scrollingElement!.scrollWidth - document.scrollingElement!.clientWidth);
    expect(overflow).toBe(0);
    await bar.getByRole("button", { name: "Submit offer" }).click();
    await expect(page.getByRole("heading", { name: "Is this offer site unseen?" })).toBeVisible();
    await expect(bar).toHaveCount(0);
    await expectAxeClean(page);
  });
});
