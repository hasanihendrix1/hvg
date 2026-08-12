import { test, expect } from "@playwright/test";

// Full seller journey with the backend mocked at the network layer —
// no real leads are ever created by CI.

test.beforeEach(async ({ page }) => {
  await page.route("**/.netlify/functions/track-event", (route) =>
    route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) })
  );
});

test("two-step journey: address, details, consent optional, success", async ({
  page,
}) => {
  const submissions: any[] = [];
  await page.route("**/.netlify/functions/submit-lead", async (route) => {
    submissions.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) });
  });

  await page.goto("/get-offer/");
  await page.getByLabel("Property address").fill("123 E2E Way, Atlanta, GA");
  await page.getByRole("button", { name: "Get my cash offer" }).click();

  // Step 2 receives focus on its heading
  await expect(
    page.getByRole("heading", { name: /Almost done/ })
  ).toBeFocused();

  await page.getByLabel("Your name").fill("Playwright Seller");
  await page.getByLabel("Mobile phone").fill("(404) 555-0142");
  // Consent boxes stay UNCHECKED — submission must still succeed
  await page
    .getByRole("button", { name: /Get my cash offer — free/ })
    .click();

  await expect(
    page.getByRole("heading", { name: /what happens next/ })
  ).toBeVisible();

  // Partial capture fired at step 1, complete at step 2
  const stages = submissions.map((s) => s.stage);
  expect(stages).toContain("partial");
  expect(stages).toContain("complete");
  const complete = submissions.find((s) => s.stage === "complete");
  expect(complete.consentTransactional).toBe(false);
  expect(complete.consentMarketing).toBe(false);
  expect(complete.submissionId).toBe(
    submissions.find((s) => s.stage === "partial").submissionId
  );
});

test("backend failure shows honest error with phone fallback", async ({
  page,
}) => {
  await page.route("**/.netlify/functions/submit-lead", async (route) => {
    const body = route.request().postDataJSON();
    if (body.stage === "complete") {
      await route.fulfill({ status: 500, body: "{}" });
    } else {
      await route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) });
    }
  });

  await page.goto("/get-offer/");
  await page.getByLabel("Property address").fill("123 E2E Way, Atlanta, GA");
  await page.getByRole("button", { name: "Get my cash offer" }).click();
  await page.getByLabel("Your name").fill("Playwright Seller");
  await page.getByLabel("Mobile phone").fill("(404) 555-0142");
  await page
    .getByRole("button", { name: /Get my cash offer — free/ })
    .click();

  const alert = page.getByRole("alert");
  await expect(alert).toContainText("call or text us at (678) 710-5786");
  await expect(page.getByText(/what happens next/)).not.toBeVisible();
});

test("invalid phone blocks submission with a clear message", async ({
  page,
}) => {
  let completeCalls = 0;
  await page.route("**/.netlify/functions/submit-lead", async (route) => {
    if (route.request().postDataJSON().stage === "complete") completeCalls++;
    await route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) });
  });
  await page.goto("/get-offer/");
  await page.getByLabel("Property address").fill("123 E2E Way, Atlanta, GA");
  await page.getByRole("button", { name: "Get my cash offer" }).click();
  await page.getByLabel("Your name").fill("Playwright Seller");
  await page.getByLabel("Mobile phone").fill("not-a-phone");
  await page
    .getByRole("button", { name: /Get my cash offer — free/ })
    .click();
  await expect(page.getByRole("alert")).toContainText("valid phone number");
  expect(completeCalls).toBe(0);
});

test("homepage quick-start hands the address into step 2", async ({
  page,
}) => {
  await page.route("**/.netlify/functions/submit-lead", (route) =>
    route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) })
  );
  await page.goto("/");
  await page
    .locator("#hero-address")
    .fill("456 Quickstart Ln, Decatur, GA");
  await page
    .locator(".hero-quickstart button[type=submit]")
    .click();
  await expect(page).toHaveURL(/\/get-offer\/?\?address=/);
  await expect(page.getByLabel("Property address")).toHaveValue(
    "456 Quickstart Ln, Decatur, GA"
  );
});
