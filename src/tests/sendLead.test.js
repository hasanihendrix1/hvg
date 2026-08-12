jest.mock("axios", () => ({ post: jest.fn() }));
const axios = require("axios");
const { handler } = require("../../netlify/functions/sendLead");

const humanTimestamp = () => String(Date.now() - 10_000);

const post = (payload) =>
  handler({ httpMethod: "POST", body: JSON.stringify(payload) }, {});

beforeEach(() => {
  axios.post.mockReset();
  axios.post.mockResolvedValue({ data: { ok: true } });
});

test("rejects non-POST requests", async () => {
  const res = await handler({ httpMethod: "GET" }, {});
  expect(res.statusCode).toBe(405);
});

test("forwards a legitimate lead with formatted timestamp and no honeypot field", async () => {
  const res = await post({
    name: "Test Seller",
    phone: "(404) 555-0142",
    address: "123 Main St",
    website: "",
    timestamp: humanTimestamp(),
  });
  expect(res.statusCode).toBe(200);
  expect(axios.post).toHaveBeenCalledTimes(1);
  const forwarded = axios.post.mock.calls[0][1];
  expect(forwarded).not.toHaveProperty("website");
  // Timestamp must be a readable date string, not epoch millis
  expect(forwarded.timestamp).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
});

test("silently drops a lead when the honeypot is filled", async () => {
  const res = await post({
    name: "Bot",
    phone: "(404) 555-0142",
    address: "123 Main St",
    website: "https://spam.example",
    timestamp: humanTimestamp(),
  });
  // Fake success so bots get no signal
  expect(res.statusCode).toBe(200);
  expect(axios.post).not.toHaveBeenCalled();
});

test("silently drops a lead submitted faster than a human could type", async () => {
  const res = await post({
    name: "Bot",
    phone: "(404) 555-0142",
    address: "123 Main St",
    website: "",
    timestamp: String(Date.now()),
  });
  expect(res.statusCode).toBe(200);
  expect(axios.post).not.toHaveBeenCalled();
});

test("silently drops a lead with a missing or garbage timestamp", async () => {
  const res = await post({
    name: "Bot",
    phone: "(404) 555-0142",
    address: "123 Main St",
  });
  expect(res.statusCode).toBe(200);
  expect(axios.post).not.toHaveBeenCalled();
});

test("returns 500 when the upstream webhook fails", async () => {
  axios.post.mockRejectedValue(new Error("upstream down"));
  const res = await post({
    name: "Test Seller",
    phone: "(404) 555-0142",
    address: "123 Main St",
    website: "",
    timestamp: humanTimestamp(),
  });
  expect(res.statusCode).toBe(500);
});
