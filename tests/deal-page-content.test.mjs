import { test, expect } from "vitest";
import {
  closeByLabel,
  readDealContent,
  readDealPageState,
  drivePhotoUrl,
  phoneDisplay,
  walkthroughCountdown,
  walkthroughOpen,
  walkthroughParts,
} from "../src/data/deal-page.ts";

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
  walkthrough: { at: "2026-11-21T15:00:00.000Z", label: "Sat, Nov 21 · 10:00 AM" },
};

test("well-formed content passes through, without the ARV the page never shows", () => {
  const { arv: _arv, ...shown } = GOOD;
  expect(readDealContent(GOOD)).toEqual(shown);
});

test("a page needs its street, town and price", () => {
  expect(readDealContent({ ...GOOD, street: "" })).toBeNull();
  expect(readDealContent({ ...GOOD, locality: null })).toBeNull();
  expect(readDealContent({ ...GOOD, price: { label: "Suggested Price", amount: 0 } })).toBeNull();
  expect(readDealContent({ ...GOOD, price: { label: "Suggested Price", amount: "165000" } })).toBeNull();
  expect(readDealContent(null)).toBeNull();
});

test("an ARV dotato sends is dropped (owner, 2026-11-14: no ARV on the deal page)", () => {
  expect(readDealContent(GOOD)).not.toHaveProperty("arv");
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
  expect(readDealPageState({ state: "live", slug: "s", content: GOOD })).toEqual({ state: "live", slug: "s", content: readDealContent(GOOD) });
  expect(readDealPageState({ state: "live", content: GOOD })).toEqual({ state: "unavailable" });
  expect(readDealPageState({ state: "live", slug: "s", content: {} })).toEqual({ state: "unavailable" });
  expect(readDealPageState({ state: "error" })).toEqual({ state: "error" });
  expect(readDealPageState(undefined)).toEqual({ state: "unavailable" });
});

test("helpers", () => {
  expect(phoneDisplay("+14705550123")).toBe("(470) 555-0123");
  expect(drivePhotoUrl("ab c", 640)).toBe("https://drive.google.com/thumbnail?id=ab%20c&sz=w640");
});

test("dollars read as a person writes them, cents rounded, nothing else accepted", async () => {
  const { parseDollars } = await import("../src/data/deal-page.ts");
  expect(parseDollars("158000")).toBe(158000);
  expect(parseDollars("$158,000")).toBe(158000);
  expect(parseDollars(" $158,000.00 ")).toBe(158000);
  expect(parseDollars("158,000.50")).toBe(158001);
  expect(parseDollars("3,000")).toBe(3000);
  for (const bad of ["", "3k", "1.2.3", "$", "15.800.000", "-5", "abc", "1,00,0"]) expect(parseDollars(bad), bad).toBeNull();
});

test("the walkthrough needs a real instant and its label, or the page shows none", () => {
  expect(readDealContent({ ...GOOD, walkthrough: null }).walkthrough).toBeNull();
  expect(readDealContent({ ...GOOD, walkthrough: undefined }).walkthrough).toBeNull();
  expect(readDealContent({ ...GOOD, walkthrough: { at: "Saturday at 10", label: "Sat" } }).walkthrough).toBeNull();
  expect(readDealContent({ ...GOOD, walkthrough: { at: "2026-11-21T15:00:00.000Z" } }).walkthrough).toBeNull();
  expect(readDealContent({ ...GOOD, walkthrough: { at: "2026-11-21T10:00:00-05:00", label: "Sat, Nov 21 · 10:00 AM" } }).walkthrough).toEqual(GOOD.walkthrough);
});

test("the RSVP is open until the walkthrough starts", () => {
  const w = GOOD.walkthrough;
  expect(walkthroughOpen(w, Date.parse(w.at) - 1)).toBe(true);
  expect(walkthroughOpen(w, Date.parse(w.at))).toBe(false);
  expect(walkthroughOpen(null, 0)).toBe(false);
});

test("the walkthrough label splits into the ticket's stub and its time", () => {
  expect(walkthroughParts("Sat, Nov 21 · 10:00 AM")).toEqual({ weekday: "Sat", month: "Nov", day: "21", time: "10:00 AM" });
  expect(walkthroughParts("Tue, Dec 1 · 9:30 AM")).toEqual({ weekday: "Tue", month: "Dec", day: "1", time: "9:30 AM" });
  // Any other shape keeps the whole label, never a half-read stub
  expect(walkthroughParts("Saturday at 10")).toBeNull();
  expect(walkthroughParts("Sat, Foo 21 · 10:00 AM")).toBeNull();
});

test("the countdown counts calendar days to the printed day, and stops once it starts", () => {
  const walk = { at: "2026-11-21T15:00:00.000Z", label: "Sat, Nov 21 · 10:00 AM" };
  expect(walkthroughCountdown(walk, new Date(2026, 10, 18, 9))).toBe("In 3 days");
  // Late the night before is still "Tomorrow", not "In 0 days" by a 24-hour count
  expect(walkthroughCountdown(walk, new Date(2026, 10, 20, 23, 30))).toBe("Tomorrow");
  expect(walkthroughCountdown(walk, new Date(2026, 10, 21, 7))).toBe("Today");
  expect(walkthroughCountdown(walk, new Date("2026-11-21T15:00:00.000Z"))).toBeNull();
  // A month out is noise, not a nudge
  expect(walkthroughCountdown(walk, new Date(2026, 9, 1))).toBeNull();
  expect(walkthroughCountdown({ ...walk, label: "Saturday" }, new Date(2026, 10, 18))).toBeNull();
});

test("a walkthrough across New Year counts into the new year", () => {
  const walk = { at: "2027-01-02T15:00:00.000Z", label: "Sat, Jan 2 · 10:00 AM" };
  expect(walkthroughCountdown(walk, new Date(2026, 11, 30, 12))).toBe("In 3 days");
});

test("the close-by day is read from the date itself", () => {
  expect(closeByLabel("2026-12-12")).toBe("Sat, Dec 12");
  expect(closeByLabel("2026-12-11")).toBe("Fri, Dec 11");
  expect(closeByLabel("not-a-date")).toBe("not-a-date");
});
