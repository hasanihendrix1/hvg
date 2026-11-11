import { test, expect, vi, beforeEach } from "vitest";

vi.mock("axios", () => {
  const post = vi.fn();
  const mock = { post };
  return { default: mock };
});

import axios from "axios";
import {
  handler,
  BUYER_CONSENT_TEXT,
  BUYER_DEAL_ALERTS_CONSENT_TEXT,
  BUYER_DEAL_ALERTS_CONSENT_VERSION,
  BUYER_DEAL_UPDATES_CONSENT_TEXT,
  BUYER_DEAL_UPDATES_CONSENT_VERSION,
} from "../../netlify/functions/newBuyer.js";

const SUPABASE_PATH = "/rest/v1/investor_signups";

const post = (payload) =>
  handler(
    { httpMethod: "POST", headers: {}, body: JSON.stringify(payload) },
    {}
  );

// The legacy BuyerForm's payload (the phone arrives as `number`, there is no
// `contact` and no `market` field) plus the consent yes, required since
// 2026-11-09.
const realBuyerFormPayload = (overrides = {}) => ({
  firstName: "Test",
  lastName: "Investor",
  email: "test@example.com",
  investorLiftScore: 0,
  number: "(404) 555-0142",
  buyerType: "Cash Buyer",
  level: "Potential Buyer",
  consentMarketing: true,
  ...overrides,
});

const callsTo = (fragment) =>
  axios.post.mock.calls.filter(([url]) => url.includes(fragment));

const DOTATO_URL = "https://dotato.example/api/webhooks/hvg-buyers/tok";

beforeEach(() => {
  axios.post.mockReset();
  axios.post.mockResolvedValue({ data: { ok: true } });
  vi.unstubAllEnvs();
});

test("rejects non-POST requests", async () => {
  const res = await handler({ httpMethod: "GET", headers: {} }, {});
  expect(res.statusCode).toBe(405);
});

// Regression: an earlier draft validated a `contact` field the real client
// never sends (it sends `number`), rejecting every live signup.
test("accepts the exact payload the live BuyerForm sends", async () => {
  const res = await post(realBuyerFormPayload());
  expect(res.statusCode).toBe(200);
  const supabaseCalls = callsTo(SUPABASE_PATH);
  expect(supabaseCalls).toHaveLength(1);
  expect(supabaseCalls[0][1]).toMatchObject({
    first_name: "Test",
    last_name: "Investor",
    contact: "(404) 555-0142",
    email: "test@example.com",
    buyer_type: "Cash Buyer",
  });
});

test("rejects a signup with missing required fields before any sink", async () => {
  const res = await post(realBuyerFormPayload({ email: "" }));
  expect(res.statusCode).toBe(400);
  expect(axios.post).not.toHaveBeenCalled();
});

test("a Netlify Forms 200 does NOT count as success when Supabase fails", async () => {
  axios.post.mockImplementation((url) =>
    url.includes(SUPABASE_PATH)
      ? Promise.reject(new Error("supabase down"))
      : Promise.resolve({ data: { ok: true } })
  );
  const res = await post(realBuyerFormPayload());
  expect(res.statusCode).toBe(500);
});

test("returns 500 when every destination fails", async () => {
  axios.post.mockRejectedValue(new Error("everything down"));
  const res = await post(realBuyerFormPayload());
  expect(res.statusCode).toBe(500);
});

test("refuses a signup without the calls-and-emails consent, before any sink", async () => {
  for (const consentMarketing of [false, undefined, "true"]) {
    const res = await post(realBuyerFormPayload({ consentMarketing }));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).missing).toContain("consent");
  }
  expect(axios.post).not.toHaveBeenCalled();
});

test("mirrors a signup to dotato's buyer webhook when it is configured", async () => {
  vi.stubEnv("DOTATO_BUYERS_WEBHOOK_URL", DOTATO_URL);
  const res = await post(realBuyerFormPayload({ buyerType: "Landlord" }));
  expect(res.statusCode).toBe(200);
  const [[, sent]] = callsTo("/hvg-buyers/");
  expect(sent).toMatchObject({
    firstName: "Test",
    lastName: "Investor",
    phone: "(404) 555-0142",
    email: "test@example.com",
    buyerType: "Landlord",
    consentCallsEmail: true,
    consentText: BUYER_CONSENT_TEXT,
  });
  expect(sent.submissionId).toMatch(/^[0-9a-f-]{36}$/);
  // The website's own record carries the same id, so the two can be matched.
  const [[, stored]] = callsTo(SUPABASE_PATH);
  expect(stored.raw.submissionId).toBe(sent.submissionId);
});

test("the website's own record keeps the wording the buyer agreed to, dotato or not", async () => {
  await post(realBuyerFormPayload());
  const [[, stored]] = callsTo(SUPABASE_PATH);
  expect(stored.raw.consentText).toBe(BUYER_CONSENT_TEXT);
});

test("sends nothing to dotato while the webhook is not configured", async () => {
  await post(realBuyerFormPayload());
  expect(callsTo("/hvg-buyers/")).toHaveLength(0);
});

test("dotato is best-effort: its failure never fails a saved signup, and it never stands in for the store", async () => {
  vi.stubEnv("DOTATO_BUYERS_WEBHOOK_URL", DOTATO_URL);
  axios.post.mockImplementation((url) =>
    url.includes("/hvg-buyers/") ? Promise.reject(new Error("dotato down")) : Promise.resolve({ data: { ok: true } })
  );
  expect((await post(realBuyerFormPayload())).statusCode).toBe(200);

  axios.post.mockImplementation((url) =>
    url.includes("/hvg-buyers/") ? Promise.resolve({ data: { ok: true } }) : Promise.reject(new Error("store down"))
  );
  expect((await post(realBuyerFormPayload())).statusCode).toBe(500);
});

// The two optional texting boxes (investor deal texts). Joining must never
// depend on either, and both records carry each box's state with the wording
// and version shown, so a yes can be proven and a no is never mistaken for
// one.
const textEvidence = ({ alerts, updates }) => ({
  consentDealAlerts: alerts,
  dealAlertsConsentVersion: BUYER_DEAL_ALERTS_CONSENT_VERSION,
  dealAlertsConsentText: BUYER_DEAL_ALERTS_CONSENT_TEXT,
  consentDealUpdates: updates,
  dealUpdatesConsentVersion: BUYER_DEAL_UPDATES_CONSENT_VERSION,
  dealUpdatesConsentText: BUYER_DEAL_UPDATES_CONSENT_TEXT,
});

// dotato's ingest (lib/hvg-buyers/ingest.ts) reads one
// texting box as consentTexts / textConsentVersion / textConsentText and
// records a ticked one as a yes. Those fields carry the deal-alerts box only,
// so a deal-updates yes is never filed as a yes to marketing.
const dotatoLegacyBox = (alerts) => ({
  consentTexts: alerts,
  textConsentVersion: BUYER_DEAL_ALERTS_CONSENT_VERSION,
  textConsentText: BUYER_DEAL_ALERTS_CONSENT_TEXT,
});

const BOTH_WAYS = [
  { alerts: false, updates: false },
  { alerts: true, updates: false },
  { alerts: false, updates: true },
  { alerts: true, updates: true },
];

for (const boxes of BOTH_WAYS) {
  test(`alerts ${boxes.alerts ? "ticked" : "unticked"}, updates ${boxes.updates ? "ticked" : "unticked"}: joins, and both records say so box by box`, async () => {
    vi.stubEnv("DOTATO_BUYERS_WEBHOOK_URL", DOTATO_URL);
    const res = await post(
      realBuyerFormPayload({
        consentDealAlerts: boxes.alerts,
        consentDealUpdates: boxes.updates,
      })
    );
    expect(res.statusCode).toBe(200);
    const [[, stored]] = callsTo(SUPABASE_PATH);
    expect(stored.raw).toMatchObject(textEvidence(boxes));
    const [[, sent]] = callsTo("/hvg-buyers/");
    expect(sent).toMatchObject(textEvidence(boxes));
    expect(sent).toMatchObject(dotatoLegacyBox(boxes.alerts));
    expect(sent.consentCallsEmail).toBe(true);
  });
}

test("a payload without the texting fields (an older client) is a no to both", async () => {
  vi.stubEnv("DOTATO_BUYERS_WEBHOOK_URL", DOTATO_URL);
  expect((await post(realBuyerFormPayload())).statusCode).toBe(200);
  const none = { alerts: false, updates: false };
  const [[, stored]] = callsTo(SUPABASE_PATH);
  expect(stored.raw).toMatchObject(textEvidence(none));
  const [[, sent]] = callsTo("/hvg-buyers/");
  expect(sent).toMatchObject(textEvidence(none));
  expect(sent).toMatchObject(dotatoLegacyBox(false));
});

// The old single box's field is not a yes to either new box: the buyer who
// sent it saw other wording.
test("the retired single box's field is never read as a yes", async () => {
  vi.stubEnv("DOTATO_BUYERS_WEBHOOK_URL", DOTATO_URL);
  await post(realBuyerFormPayload({ consentTexts: true }));
  const [[, stored]] = callsTo(SUPABASE_PATH);
  expect(stored.raw).toMatchObject({ consentDealAlerts: false, consentDealUpdates: false });
  const [[, sent]] = callsTo("/hvg-buyers/");
  expect(sent).toMatchObject({ consentDealAlerts: false, consentDealUpdates: false, consentTexts: false });
});

test("only a literal true counts as a yes, box by box", async () => {
  for (const v of ["true", 1, "yes", null]) {
    axios.post.mockClear();
    await post(realBuyerFormPayload({ consentDealAlerts: v, consentDealUpdates: v }));
    const [[, stored]] = callsTo(SUPABASE_PATH);
    expect(stored.raw.consentDealAlerts).toBe(false);
    expect(stored.raw.consentDealUpdates).toBe(false);
  }
});

// The sheet mirror is a third copy of the signup; it must not disagree with
// the other two about texting consent.
test("the sheet mirror gets the same yes-or-no per box as the records", async () => {
  const SHEET_URL = "https://script.google.example/buyer";
  vi.stubEnv("REACT_APP_GOOGLE_APPS_SCRIPT_URL_BUYER", SHEET_URL);
  vi.resetModules();
  const { handler: withSheet } = await import("../../netlify/functions/newBuyer.js");
  await withSheet(
    {
      httpMethod: "POST",
      headers: {},
      body: JSON.stringify(
        realBuyerFormPayload({ consentDealAlerts: "true", consentDealUpdates: true })
      ),
    },
    {}
  );
  const [[, mirrored]] = callsTo(SHEET_URL);
  expect(mirrored.consentDealAlerts).toBe(false);
  expect(mirrored.consentDealUpdates).toBe(true);
});
