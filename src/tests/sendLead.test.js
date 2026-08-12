jest.mock("axios", () => ({ post: jest.fn() }));
const axios = require("axios");
const { handler } = require("../../netlify/functions/sendLead");

const SUPABASE_PATH = "/rest/v1/seller_leads";

const post = (payload) =>
  handler(
    { httpMethod: "POST", headers: {}, body: JSON.stringify(payload) },
    {}
  );

const legitLead = (overrides = {}) => ({
  name: "Test Seller",
  phone: "(404) 555-0142",
  address: "123 Main St",
  fax: "",
  fillTimeMs: 10_000,
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

test("rejects a payload missing required fields before touching any sink", async () => {
  const res = await post(legitLead({ name: "" }));
  expect(res.statusCode).toBe(400);
  expect(axios.post).not.toHaveBeenCalled();
});

test("stores a legitimate lead in Supabase with spam-check metadata", async () => {
  const res = await post(legitLead());
  expect(res.statusCode).toBe(200);
  const supabaseCalls = callsTo(SUPABASE_PATH);
  expect(supabaseCalls).toHaveLength(1);
  const [, body, config] = supabaseCalls[0];
  expect(body).toMatchObject({
    name: "Test Seller",
    phone: "(404) 555-0142",
    address: "123 Main St",
    fill_time_ms: 10_000,
  });
  expect(config.headers.apikey).toBeTruthy();
});

test("clamps absurd fill times to the int4 column limit", async () => {
  await post(legitLead({ fillTimeMs: 99_999_999_999 }));
  const [, body] = callsTo(SUPABASE_PATH)[0];
  expect(body.fill_time_ms).toBe(2147483647);
});

test("attempts the Netlify Forms mirror", async () => {
  await post(legitLead());
  const formCalls = axios.post.mock.calls.filter(([, body]) =>
    String(body).includes("form-name=seller-lead")
  );
  expect(formCalls).toHaveLength(1);
});

test("a Netlify Forms 200 does NOT count as success when Supabase fails", async () => {
  // The SPA catch-all can answer that POST with a 200 even when Netlify
  // Forms recorded nothing, so it must never mask a lost lead.
  axios.post.mockImplementation((url) =>
    url.includes(SUPABASE_PATH)
      ? Promise.reject(new Error("supabase down"))
      : Promise.resolve({ data: { ok: true } })
  );
  const res = await post(legitLead());
  expect(res.statusCode).toBe(500);
});

test("returns 500 when every destination fails", async () => {
  axios.post.mockRejectedValue(new Error("everything down"));
  const res = await post(legitLead());
  expect(res.statusCode).toBe(500);
});

test("silently drops a lead when the honeypot is filled", async () => {
  const res = await post(legitLead({ fax: "https://spam.example" }));
  expect(res.statusCode).toBe(200);
  expect(axios.post).not.toHaveBeenCalled();
});

test("silently drops a lead submitted faster than a human could type", async () => {
  const res = await post(legitLead({ fillTimeMs: 500 }));
  expect(res.statusCode).toBe(200);
  expect(axios.post).not.toHaveBeenCalled();
});

test("silently drops a lead with a missing or garbage fill time", async () => {
  const res = await post(legitLead({ fillTimeMs: "not-a-number" }));
  expect(res.statusCode).toBe(200);
  expect(axios.post).not.toHaveBeenCalled();
});

test("accepts a slow autofill user (2s boundary)", async () => {
  const res = await post(legitLead({ fillTimeMs: 2000 }));
  expect(res.statusCode).toBe(200);
  expect(callsTo(SUPABASE_PATH)).toHaveLength(1);
});

test("a working sheet mirror saves the lead when Supabase is down", async () => {
  jest.resetModules();
  process.env.REACT_APP_GOOGLE_APPS_SCRIPT_URL_LEAD =
    "https://script.google.com/macros/s/TEST/exec";
  try {
    // resetModules gives the re-required module a FRESH axios mock; all
    // interaction must go through that instance
    const freshAxios = require("axios");
    freshAxios.post.mockReset();
    freshAxios.post.mockImplementation((url) =>
      url.includes(SUPABASE_PATH)
        ? Promise.reject(new Error("supabase down"))
        : Promise.resolve({ data: { ok: true } })
    );
    const fresh = require("../../netlify/functions/sendLead");
    const res = await fresh.handler(
      { httpMethod: "POST", headers: {}, body: JSON.stringify(legitLead()) },
      {}
    );
    expect(res.statusCode).toBe(200);
    const sheetCalls = freshAxios.post.mock.calls.filter(([url]) =>
      url.includes("script.google.com")
    );
    expect(sheetCalls).toHaveLength(1);
  } finally {
    delete process.env.REACT_APP_GOOGLE_APPS_SCRIPT_URL_LEAD;
    jest.resetModules();
  }
});
