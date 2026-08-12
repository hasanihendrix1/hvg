jest.mock("axios", () => ({ post: jest.fn() }));
const axios = require("axios");
const { handler } = require("../../netlify/functions/newBuyer");

const SUPABASE_PATH = "/rest/v1/investor_signups";

const post = (payload) =>
  handler(
    { httpMethod: "POST", headers: {}, body: JSON.stringify(payload) },
    {}
  );

// EXACTLY the payload BuyerForm.handleSubmit constructs (BuyerForm.js:51-59):
// the phone arrives as `number`, there is no `contact` and no `market` field.
const realBuyerFormPayload = (overrides = {}) => ({
  firstName: "Test",
  lastName: "Investor",
  email: "test@example.com",
  investorLiftScore: 0,
  number: "(404) 555-0142",
  buyerType: "Cash Buyer",
  level: "Potential Buyer",
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

// Regression test: an earlier draft validated a `contact` field that the real
// BuyerForm never sends (it sends `number`), rejecting every live signup.
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
