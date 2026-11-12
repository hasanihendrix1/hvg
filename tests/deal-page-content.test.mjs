import { test, expect } from "vitest";
import { readDealContent, readDealPageState, drivePhotoUrl, phoneDisplay } from "../src/data/deal-page.ts";

const GOOD = {
  street: "1234 Sample Dr SE",
  locality: "Atlanta, GA 30316",
  facts: "Single Family · 3 bed · 2 bath",
  occupancy: "Delivered Vacant",
  price: { label: "Suggested Price", amount: 165000 },
  arv: 295000,
  about: "Brick ranch on a corner lot.",
  mustRead: ["No due diligence after the inspection."],
  terms: ["Close on or before Fri, Dec 12."],
  disclaimer: "Not a broker.",
  heroUrl: "https://example.supabase.co/storage/v1/object/public/deal-photos/s/front.jpg",
  photos: [{ id: "1AbCdEfGhIjKlMnOp", name: "Kitchen.jpg" }],
  photosFolderUrl: "https://drive.google.com/drive/folders/abc",
  phone: "+14705550123",
  deposit: 3000,
  closeBy: "2026-12-12",
};

test("well-formed content passes through", () => {
  expect(readDealContent(GOOD)).toEqual(GOOD);
});

test("a page needs its street, town and price", () => {
  expect(readDealContent({ ...GOOD, street: "" })).toBeNull();
  expect(readDealContent({ ...GOOD, locality: null })).toBeNull();
  expect(readDealContent({ ...GOOD, price: { label: "Suggested Price", amount: 0 } })).toBeNull();
  expect(readDealContent({ ...GOOD, price: { label: "Suggested Price", amount: "165000" } })).toBeNull();
  expect(readDealContent(null)).toBeNull();
});

test("an ARV prints only as a real number", () => {
  expect(readDealContent({ ...GOOD, arv: null }).arv).toBeNull();
  expect(readDealContent({ ...GOOD, arv: "295000" }).arv).toBeNull();
  expect(readDealContent({ ...GOOD, arv: -1 }).arv).toBeNull();
});

test("links must be https, photos must be Drive ids, the phone must be dialable", () => {
  const c = readDealContent({
    ...GOOD,
    heroUrl: "http://example.com/x.jpg",
    photosFolderUrl: "javascript:alert(1)",
    photos: [{ id: "../../x" }, { id: "ok_ID-123456789", name: 7 }, "nope"],
    phone: "4705550123",
    closeBy: "Dec 12",
  });
  expect(c.heroUrl).toBeNull();
  expect(c.photosFolderUrl).toBeNull();
  expect(c.photos).toEqual([{ id: "ok_ID-123456789", name: null }]);
  expect(c.phone).toBeNull();
  expect(c.closeBy).toBeNull();
});

test("any price label but Buy Now reads Suggested Price", () => {
  expect(readDealContent({ ...GOOD, price: { label: "ARV", amount: 1000 } }).price.label).toBe("Suggested Price");
  expect(readDealContent({ ...GOOD, price: { label: "Buy Now", amount: 1000 } }).price.label).toBe("Buy Now");
});

test("the page's state reads live only with a slug and good content", () => {
  expect(readDealPageState({ state: "live", slug: "s", content: GOOD })).toEqual({ state: "live", slug: "s", content: GOOD });
  expect(readDealPageState({ state: "live", content: GOOD })).toEqual({ state: "unavailable" });
  expect(readDealPageState({ state: "live", slug: "s", content: {} })).toEqual({ state: "unavailable" });
  expect(readDealPageState({ state: "error" })).toEqual({ state: "error" });
  expect(readDealPageState(undefined)).toEqual({ state: "unavailable" });
});

test("helpers", () => {
  expect(phoneDisplay("+14705550123")).toBe("(470) 555-0123");
  expect(drivePhotoUrl("ab c", 640)).toBe("https://drive.google.com/thumbnail?id=ab%20c&sz=w640");
});
