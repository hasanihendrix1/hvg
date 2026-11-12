import { test, expect, vi, beforeEach } from "vitest";

vi.mock("axios", () => {
  const get = vi.fn();
  const mock = { get };
  return { default: mock };
});

import axios from "axios";
import { handler } from "../../netlify/functions/getDeals.js";

const SANITY_DEALS = [
  {
    _id: "s1",
    timestamp: "2021-Q1",
    price: "114500",
    status: "Sold",
    address: "3002 Arabian Woods Dr, Lithonia, GA 30038",
  },
  {
    _id: "s2",
    timestamp: "2025-Q2",
    price: "47500",
    status: "Available",
    address: "4243 E San Francisco Avenue St Louis, MO 63115",
  },
];

const BRIDGE_ROWS = [
  {
    id: "b-uuid-1",
    created_at: "2026-08-10T12:00:00Z",
    address: "789 New Deal Rd, Decatur, GA 30032",
    price: "199000",
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1400,
    image_url: null,
    media_link: null,
    status: "Available",
    active: true,
  },
];

const route = (sanity, bridge) => {
  axios.get.mockImplementation((url) => {
    if (url.includes("bridge_deals")) return bridge();
    return sanity();
  });
};

beforeEach(() => {
  process.env.REACT_APP_SANITY_URL = "https://sanity.example/query";
  axios.get.mockReset();
});

test("merges live bridge inventory ahead of the Sanity history", async () => {
  route(
    () => Promise.resolve({ data: { result: SANITY_DEALS } }),
    () => Promise.resolve({ data: BRIDGE_ROWS })
  );
  const res = await handler();
  const deals = JSON.parse(res.body);
  expect(res.statusCode).toBe(200);
  expect(deals[0]._id).toBe("bridge-b-uuid-1");
  expect(deals[0].status).toBe("Available");
  expect(deals[0].timestamp).toBe("2026-Q3");
  // GA filter still applies to the Sanity history (St. Louis excluded)
  expect(deals.some((d) => d.address.includes("MO"))).toBe(false);
  expect(deals).toHaveLength(2);
});

test("serves the Sanity history alone when the bridge is down", async () => {
  route(
    () => Promise.resolve({ data: { result: SANITY_DEALS } }),
    () => Promise.reject(new Error("bridge down"))
  );
  const res = await handler();
  const deals = JSON.parse(res.body);
  expect(res.statusCode).toBe(200);
  expect(deals).toHaveLength(1);
  expect(deals[0]._id).toBe("s1");
});

test("serves live inventory alone when Sanity is down", async () => {
  route(
    () => Promise.reject(new Error("sanity down")),
    () => Promise.resolve({ data: BRIDGE_ROWS })
  );
  const res = await handler();
  const deals = JSON.parse(res.body);
  expect(res.statusCode).toBe(200);
  expect(deals).toHaveLength(1);
  expect(deals[0].status).toBe("Available");
});

test("500s only when both sources fail", async () => {
  route(
    () => Promise.reject(new Error("sanity down")),
    () => Promise.reject(new Error("bridge down"))
  );
  const res = await handler();
  expect(res.statusCode).toBe(500);
});

// DOT-512: a live deal shows its town and price; its photos and media go to the
// buyer list, whatever the bridge row carries.
test("a live deal is served without its photo or media link, marked live", async () => {
  route(
    () => Promise.resolve({ data: { result: SANITY_DEALS } }),
    () =>
      Promise.resolve({
        data: [{ ...BRIDGE_ROWS[0], address: "Decatur, GA 30032", image_url: "https://x/y.jpg", media_link: "https://drive.google.com/x" }],
      })
  );
  const deals = JSON.parse((await handler()).body);
  expect(deals[0]).toMatchObject({ address: "Decatur, GA 30032", image: null, mediaLink: null, live: true });
  expect(deals[1].live).toBeUndefined();
});

// DOT-512: anon may read only the columns /investors shows, so the read names them.
test("the inventory read names its columns and never asks for photos, media or dotato's id", async () => {
  route(
    () => Promise.resolve({ data: { result: SANITY_DEALS } }),
    () => Promise.resolve({ data: BRIDGE_ROWS })
  );
  await handler();
  const url = axios.get.mock.calls.map(([u]) => u).find((u) => u.includes("bridge_deals"));
  const select = new URL(url).searchParams.get("select").split(",");
  expect(select).not.toContain("*");
  for (const hidden of ["image_url", "media_link", "source_lead_id"]) expect(select).not.toContain(hidden);
  expect(select).toEqual(expect.arrayContaining(["id", "created_at", "address", "price", "status"]));
});
