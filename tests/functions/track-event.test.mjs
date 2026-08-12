import { test, expect, vi, beforeEach } from "vitest";

vi.mock("axios", () => {
  const post = vi.fn();
  const mock = { post };
  return { default: mock };
});

import axios from "axios";
import { handler } from "../../netlify/functions/track-event.js";

const post = (payload) =>
  handler(
    { httpMethod: "POST", headers: {}, body: JSON.stringify(payload) },
    {}
  );

beforeEach(() => {
  axios.post.mockReset();
  axios.post.mockResolvedValue({ data: { ok: true } });
});

test("records an allowed event", async () => {
  const res = await post({ event: "call_click", path: "/get-offer" });
  expect(res.statusCode).toBe(200);
  expect(axios.post).toHaveBeenCalledTimes(1);
  expect(axios.post.mock.calls[0][1]).toMatchObject({
    event: "call_click",
    path: "/get-offer",
  });
});

test("rejects unknown event names", async () => {
  const res = await post({ event: "made_up_event" });
  expect(res.statusCode).toBe(400);
  expect(axios.post).not.toHaveBeenCalled();
});

test("swallows sink failures — analytics never breaks anything", async () => {
  axios.post.mockRejectedValue(new Error("down"));
  const res = await post({ event: "page_view", path: "/" });
  expect(res.statusCode).toBe(200);
});
