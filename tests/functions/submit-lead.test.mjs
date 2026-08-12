import { test, expect, vi, beforeEach } from "vitest";

vi.mock("axios", () => {
  const post = vi.fn();
  const mock = { post };
  return { default: mock };
});

import axios from "axios";
import {
  handler,
  CONSENT_VERSION,
} from "../../netlify/functions/submit-lead.js";

const SUPABASE_PATH = "/rest/v1/seller_leads";

const post = (payload) =>
  handler(
    { httpMethod: "POST", headers: {}, body: JSON.stringify(payload) },
    {}
  );

const completeLead = (overrides = {}) => ({
  stage: "complete",
  submissionId: "11111111-2222-3333-4444-555555555555",
  address: "123 Main St NW, Atlanta, GA",
  name: "Test Seller",
  phone: "(404) 555-0142",
  email: "seller@example.com",
  timeline: "Within 30 days",
  consentTransactional: true,
  consentMarketing: false,
  fax: "",
  fillTimeMs: 12_000,
  pageUrl: "https://hendrixventures.com/get-offer",
  utm: { utm_source: "test" },
  ...overrides,
});

const callsTo = (fragment) =>
  axios.post.mock.calls.filter(([url]) => url.includes(fragment));

beforeEach(() => {
  axios.post.mockReset();
  axios.post.mockResolvedValue({ data: { ok: true } });
});

test("rejects non-POST requests", async () => {
  const res = await handler({ httpMethod: "GET", headers: {} }, {});
  expect(res.statusCode).toBe(405);
});

test("partial capture stores address-only lead in Supabase ONLY (no mirrors)", async () => {
  const res = await post({
    stage: "partial",
    submissionId: "11111111-2222-3333-4444-555555555555",
    address: "123 Main St NW, Atlanta, GA",
    fax: "",
  });
  expect(res.statusCode).toBe(200);
  expect(axios.post).toHaveBeenCalledTimes(1);
  const [, body] = callsTo(SUPABASE_PATH)[0];
  expect(body.stage).toBe("partial");
  expect(body.address).toBe("123 Main St NW, Atlanta, GA");
  expect(body.submission_id).toBe("11111111-2222-3333-4444-555555555555");
});

test("partial capture without an address is rejected", async () => {
  const res = await post({ stage: "partial", address: "  " });
  expect(res.statusCode).toBe(400);
  expect(axios.post).not.toHaveBeenCalled();
});

test("complete lead stores consent evidence with version stamp", async () => {
  const res = await post(completeLead());
  expect(res.statusCode).toBe(200);
  const [, body] = callsTo(SUPABASE_PATH)[0];
  expect(body).toMatchObject({
    stage: "complete",
    name: "Test Seller",
    phone: "(404) 555-0142",
    email: "seller@example.com",
    timeline: "Within 30 days",
    consent_transactional: true,
    consent_marketing: false,
    consent_version: CONSENT_VERSION,
  });
  expect(typeof body.consent_text).toBe("string");
  expect(body.consent_text).toContain("STOP");
  expect(body.utm).toEqual({ utm_source: "test" });
});

test("consent checkboxes are NOT required for submission", async () => {
  const res = await post(
    completeLead({ consentTransactional: false, consentMarketing: false })
  );
  expect(res.statusCode).toBe(200);
  const [, body] = callsTo(SUPABASE_PATH)[0];
  expect(body.consent_transactional).toBe(false);
  expect(body.consent_marketing).toBe(false);
});

test("complete lead missing name/phone is rejected before any sink", async () => {
  const res = await post(completeLead({ name: "" }));
  expect(res.statusCode).toBe(400);
  expect(axios.post).not.toHaveBeenCalled();
});

test("invalid phone number is rejected with 400 (client shows the message)", async () => {
  const res = await post(completeLead({ phone: "not-a-phone" }));
  expect(res.statusCode).toBe(400);
  expect(axios.post).not.toHaveBeenCalled();
});

test("honeypot drops with fake success at either stage", async () => {
  const r1 = await post({
    stage: "partial",
    address: "123 Main St",
    fax: "spam",
  });
  const r2 = await post(completeLead({ fax: "spam" }));
  expect(r1.statusCode).toBe(200);
  expect(r2.statusCode).toBe(200);
  expect(axios.post).not.toHaveBeenCalled();
});

test("too-fast complete submission drops with fake success", async () => {
  const res = await post(completeLead({ fillTimeMs: 300 }));
  expect(res.statusCode).toBe(200);
  expect(axios.post).not.toHaveBeenCalled();
});

test("a Netlify Forms 200 does NOT count as success when Supabase fails", async () => {
  axios.post.mockImplementation((url) =>
    url.includes(SUPABASE_PATH)
      ? Promise.reject(new Error("supabase down"))
      : Promise.resolve({ data: { ok: true } })
  );
  const res = await post(completeLead());
  expect(res.statusCode).toBe(500);
});

test("returns 500 when every verifiable destination fails", async () => {
  axios.post.mockRejectedValue(new Error("everything down"));
  const res = await post(completeLead());
  expect(res.statusCode).toBe(500);
});
