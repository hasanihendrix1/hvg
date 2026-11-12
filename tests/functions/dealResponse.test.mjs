import { test, expect, vi, beforeEach } from "vitest";
import { createHmac } from "node:crypto";

vi.mock("axios", () => {
  const post = vi.fn();
  return { default: { post } };
});

import axios from "axios";
import {
  handler,
  BUYER_CONSENT_TEXT,
  BUYER_DEAL_ALERTS_CONSENT_TEXT,
  BUYER_DEAL_UPDATES_CONSENT_TEXT,
} from "../../netlify/functions/dealResponse.js";

const URL_ = "https://dotato.example/api/webhooks/deal-site/tok";
const SECRET = "test-signing-secret";
const SLUG = "sample-dr-k3m9q2x7wzpa";

const interest = (overrides = {}) => ({
  slug: SLUG,
  kind: "interested",
  submissionId: "3f6c1d2e-8b7a-4c5d-9e0f-1a2b3c4d5e6f",
  firstName: "Dana",
  lastName: "Buyer",
  phone: "(404) 555-0142",
  email: "dana@example.com",
  consentCallsEmail: true,
  consentDealAlerts: false,
  consentDealUpdates: true,
  offer: null,
  fax: "",
  fillTimeMs: 9000,
  ...overrides,
});

const offer = (o = {}, overrides = {}) =>
  interest({
    kind: "offer",
    offer: { siteUnseen: true, acknowledgedUnseen: true, amount: 158000, emd: 3000, closeBy: "2026-12-12", notes: "Cash", ...o },
    ...overrides,
  });

const post = (payload) => handler({ httpMethod: "POST", headers: {}, body: JSON.stringify(payload) });
const sent = () => {
  const [url, body, opts] = axios.post.mock.calls[0];
  return { url, body, json: JSON.parse(body), headers: opts.headers };
};

beforeEach(() => {
  axios.post.mockReset();
  axios.post.mockResolvedValue({ status: 200, data: { ok: true } });
  vi.unstubAllEnvs();
  vi.stubEnv("DOTATO_DEAL_SITE_WEBHOOK_URL", URL_);
  vi.stubEnv("DOTATO_DEAL_SITE_SECRET", SECRET);
});

test("an interest goes to dotato signed over its timestamp and exact body", async () => {
  const res = await post(interest());
  expect(res.statusCode).toBe(200);
  const s = sent();
  expect(s.url).toBe(URL_);
  const ts = s.headers["X-Deal-Site-Timestamp"];
  expect(Math.abs(Number(ts) - Date.now() / 1000)).toBeLessThan(5);
  const expected = createHmac("sha256", SECRET).update(`${ts}.${s.body}`).digest("hex");
  expect(s.headers["X-Deal-Site-Signature"]).toBe(`v1=${expected}`);
  expect(s.json).toMatchObject({
    slug: SLUG,
    kind: "interested",
    submissionId: "3f6c1d2e-8b7a-4c5d-9e0f-1a2b3c4d5e6f",
    firstName: "Dana",
    phone: "(404) 555-0142",
    consentCallsEmail: true,
    consentText: BUYER_CONSENT_TEXT,
    consentDealAlerts: false,
    dealAlertsConsentText: BUYER_DEAL_ALERTS_CONSENT_TEXT,
    consentDealUpdates: true,
    dealUpdatesConsentText: BUYER_DEAL_UPDATES_CONSENT_TEXT,
    offer: null,
  });
  expect(s.json).not.toHaveProperty("fax");
  expect(s.json).not.toHaveProperty("fillTimeMs");
});

test("only a literal true ticks a texting box", async () => {
  await post(interest({ consentDealAlerts: "true", consentDealUpdates: 1 }));
  expect(sent().json.consentDealAlerts).toBe(false);
  expect(sent().json.consentDealUpdates).toBe(false);
});

test("a site-unseen offer carries its answer, price and terms", async () => {
  const res = await post(offer());
  expect(res.statusCode).toBe(200);
  expect(sent().json.offer).toEqual({ siteUnseen: true, amount: 158000, emd: 3000, closeBy: "2026-12-12", notes: "Cash" });
});

test("an offer after a walkthrough needs no acknowledgment", async () => {
  const res = await post(offer({ siteUnseen: false, acknowledgedUnseen: false, emd: null, closeBy: null, notes: null }));
  expect(res.statusCode).toBe(200);
  expect(sent().json.offer).toEqual({ siteUnseen: false, amount: 158000, emd: null, closeBy: null, notes: null });
});

test.each([
  ["no site-unseen answer", offer({ siteUnseen: undefined })],
  ["a site-unseen answer that is not a yes or no", offer({ siteUnseen: "yes" })],
  ["site unseen without the acknowledgment", offer({ acknowledgedUnseen: false })],
  ["no price", offer({ amount: undefined })],
  ["a price in cents", offer({ amount: 158000.5 })],
  ["a price too small to be one", offer({ amount: 500 })],
  ["a bad close-by date", offer({ closeBy: "Dec 12" })],
  ["no consent to calls and emails", interest({ consentCallsEmail: false })],
  ["a bad phone", interest({ phone: "555-0142" })],
  ["a bad email", interest({ email: "dana@" })],
  ["no last name", interest({ lastName: " " })],
  ["a slug that is not one", interest({ slug: "../etc" })],
  ["an unknown kind", interest({ kind: "rsvp" })],
  ["a submission id that is not a uuid", interest({ submissionId: "1" })],
])("refuses %s before anything reaches dotato", async (_name, payload) => {
  const res = await post(payload);
  expect(res.statusCode).toBe(400);
  expect(axios.post).not.toHaveBeenCalled();
});

test("a filled honeypot or a too-fast form fakes success and sends nothing", async () => {
  expect((await post(interest({ fax: "123" }))).statusCode).toBe(200);
  expect((await post(interest({ fillTimeMs: 400 }))).statusCode).toBe(200);
  expect((await post(interest({ fillTimeMs: undefined }))).statusCode).toBe(200);
  expect(axios.post).not.toHaveBeenCalled();
});

test("without the webhook settings nothing is sent and the buyer is told", async () => {
  vi.stubEnv("DOTATO_DEAL_SITE_SECRET", "");
  const res = await post(offer());
  expect(res.statusCode).toBe(503);
  expect(axios.post).not.toHaveBeenCalled();
});

test("a deal dotato no longer knows answers 410, so the page says it is gone", async () => {
  axios.post.mockRejectedValue({ response: { status: 410 } });
  expect((await post(offer())).statusCode).toBe(410);
});

test("a 404 is a webhook that is off or misaddressed: a failure, never a gone deal", async () => {
  axios.post.mockRejectedValue({ response: { status: 404 } });
  expect((await post(offer())).statusCode).toBe(502);
});

test("any other dotato failure is a failure the buyer sees", async () => {
  axios.post.mockRejectedValue({ response: { status: 500 } });
  expect((await post(offer())).statusCode).toBe(502);
  axios.post.mockRejectedValue(new Error("timeout of 8000ms exceeded"));
  expect((await post(offer())).statusCode).toBe(502);
});

test("only POST", async () => {
  const res = await handler({ httpMethod: "GET", headers: {} });
  expect(res.statusCode).toBe(405);
});
