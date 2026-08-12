jest.mock("axios", () => ({ post: jest.fn() }));
const axios = require("axios");
const { handler } = require("../../netlify/functions/sendLead");

const post = (payload) =>
  handler({ httpMethod: "POST", body: JSON.stringify(payload) }, {});

const legitLead = (overrides = {}) => ({
  name: "Test Seller",
  phone: "(404) 555-0142",
  address: "123 Main St",
  fax: "",
  fillTimeMs: 10_000,
  ...overrides,
});

beforeEach(() => {
  axios.post.mockReset();
  axios.post.mockResolvedValue({ data: { ok: true } });
});

test("rejects non-POST requests", async () => {
  const res = await handler({ httpMethod: "GET" }, {});
  expect(res.statusCode).toBe(405);
});

test("forwards a legitimate lead with a server receipt timestamp and no spam-check fields", async () => {
  const res = await post(legitLead());
  expect(res.statusCode).toBe(200);
  expect(axios.post).toHaveBeenCalledTimes(1);
  const forwarded = axios.post.mock.calls[0][1];
  expect(forwarded).not.toHaveProperty("fax");
  expect(forwarded).not.toHaveProperty("fillTimeMs");
  // Timestamp must be a readable date string stamped by the server
  expect(forwarded.timestamp).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
});

test("silently drops a lead when the honeypot is filled", async () => {
  const res = await post(legitLead({ fax: "https://spam.example" }));
  // Fake success so bots get no signal
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
  expect(axios.post).toHaveBeenCalledTimes(1);
});

test("returns 500 when the upstream webhook fails", async () => {
  axios.post.mockRejectedValue(new Error("upstream down"));
  const res = await post(legitLead());
  expect(res.statusCode).toBe(500);
});
