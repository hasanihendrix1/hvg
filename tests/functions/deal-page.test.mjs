import { test, expect, vi, beforeEach } from "vitest";

vi.mock("axios", () => {
  const get = vi.fn();
  const post = vi.fn();
  return { default: { get, post } };
});

import axios from "axios";
import {
  handler,
  pageMeta,
  renderDealPage,
  resetShellCache,
  slugFrom,
} from "../../netlify/functions/deal-page.js";

const SLUG = "sample-dr-k3m9q2x7wzpa";

// The head of the built shell (src/pages/deals/shell.astro), tag for tag.
const SHELL = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Investor deal | Hendrix Ventures Group</title><meta name="description" content="An off-market deal from Hendrix Ventures Group."><link rel="canonical" href="https://hendrixventures.com/deals/shell"><meta name="robots" content="noindex, nofollow"><meta property="og:title" content="Investor deal | Hendrix Ventures Group"><meta property="og:description" content="An off-market deal from Hendrix Ventures Group."><meta property="og:image" content="https://hendrixventures.com/og-image.jpg"><meta property="og:url" content="https://hendrixventures.com/deals/shell"><meta name="twitter:title" content="Investor deal | Hendrix Ventures Group"><meta name="twitter:description" content="An off-market deal from Hendrix Ventures Group."><meta name="twitter:image" content="https://hendrixventures.com/og-image.jpg"></head><body data-track-path="/deals/[link]"><div id="deal-page"></div></body></html>`;

const CONTENT = {
  street: "1234 Sample Dr SE",
  locality: "Atlanta, GA 30316",
  facts: "Single Family · 3 bed · 2 bath",
  occupancy: "Delivered Vacant",
  price: { label: "Suggested Price", amount: 165000 },
  arv: null,
  heroUrl: "https://ltpiqfgtfdzlgtqdghle.supabase.co/storage/v1/object/public/deal-photos/x/front.jpg",
  photos: [],
};

const head = (html) => html.slice(0, html.indexOf('<script type="application/json"'));
const dataOf = (html) => {
  const m = /<script type="application\/json" id="deal-data">([\s\S]*?)<\/script>/.exec(html);
  return m ? JSON.parse(m[1]) : null;
};

const get = (path, method = "GET") => handler({ httpMethod: method, path, headers: {} });

beforeEach(() => {
  axios.get.mockReset();
  axios.post.mockReset();
  resetShellCache();
  vi.unstubAllEnvs();
  axios.get.mockResolvedValue({ data: SHELL });
});

test("a slug is lower-case words and digits, 16 to 96 long, and nothing else", () => {
  expect(slugFrom(`/deals/${SLUG}`)).toBe(SLUG);
  expect(slugFrom(`/deals/${SLUG}/`)).toBe(SLUG);
  expect(slugFrom("/deals/short-1")).toBeNull();
  expect(slugFrom(`/deals/${SLUG.toUpperCase()}`)).toBeNull();
  expect(slugFrom(`/deals/${SLUG}/extra`)).toBeNull();
  expect(slugFrom("/deals/..%2F..%2Fetc-passwd-xxxxxxxx")).toBeNull();
  expect(slugFrom("/deals/shell")).toBeNull();
  expect(slugFrom("/investors")).toBeNull();
});

test("a texted link previews the town and the price, never the street", () => {
  const meta = pageMeta({ state: "live", slug: SLUG, content: CONTENT });
  expect(meta.title).toBe("Off-market deal · Atlanta, GA 30316");
  expect(meta.description).toBe("Suggested Price $165,000 · Hendrix Ventures Group");
  expect(meta.image).toBe(CONTENT.heroUrl);

  const html = renderDealPage({ shell: SHELL, page: { state: "live", slug: SLUG, content: CONTENT }, url: `https://hendrixventures.com/deals/${SLUG}` });
  expect(head(html)).not.toContain("Sample Dr");
  expect(head(html)).toContain("<title>Off-market deal · Atlanta, GA 30316 | Hendrix Ventures Group</title>");
  expect(head(html)).toContain(`<link rel="canonical" href="https://hendrixventures.com/deals/${SLUG}">`);
  expect(head(html)).toContain(`<meta property="og:image" content="${CONTENT.heroUrl}">`);
  expect(head(html)).toContain('<meta name="twitter:description" content="Suggested Price $165,000 · Hendrix Ventures Group">');
  expect(dataOf(html)).toEqual({ state: "live", slug: SLUG, content: CONTENT });
});

test("an agent deal previews its Buy Now price", () => {
  const meta = pageMeta({ state: "live", slug: SLUG, content: { ...CONTENT, price: { label: "Buy Now", amount: 150000 } } });
  expect(meta.description).toBe("Buy Now $150,000 · Hendrix Ventures Group");
});

test("a hero that is not https keeps the site's own preview image", () => {
  const html = renderDealPage({
    shell: SHELL,
    page: { state: "live", slug: SLUG, content: { ...CONTENT, heroUrl: "javascript:alert(1)" } },
    url: "https://hendrixventures.com/deals/x",
  });
  expect(head(html)).toContain('<meta property="og:image" content="https://hendrixventures.com/og-image.jpg">');
});

test("the deal's words cannot break out of the data script or a tag", () => {
  const evil = { ...CONTENT, locality: 'Atlanta" onload="x', about: "</script><script>alert(1)</script><!--" };
  const html = renderDealPage({ shell: SHELL, page: { state: "live", slug: SLUG, content: evil }, url: "https://hendrixventures.com/deals/x" });
  expect(html).not.toContain("<script>alert(1)");
  expect(html).not.toContain('onload="x');
  expect(html).toContain("&quot; onload=&quot;x");
  expect(dataOf(html).content.about).toBe(evil.about);
});

test("a live deal: the exact slug is looked up, and the page is never indexed or leaked by referrer", async () => {
  axios.post.mockResolvedValue({ data: { state: "live", content: CONTENT } });
  const res = await get(`/deals/${SLUG}`);
  expect(res.statusCode).toBe(200);
  expect(axios.post).toHaveBeenCalledTimes(1);
  expect(axios.post.mock.calls[0][0]).toMatch(/\/rest\/v1\/rpc\/deal_page$/);
  expect(axios.post.mock.calls[0][1]).toEqual({ p_slug: SLUG });
  expect(res.headers["X-Robots-Tag"]).toContain("noindex");
  expect(res.headers["Referrer-Policy"]).toBe("no-referrer");
  expect(res.headers["Cache-Control"]).toBe("no-store");
  expect(dataOf(res.body)).toEqual({ state: "live", slug: SLUG, content: CONTENT });
});

test("a Pending or closed deal hands out no content", async () => {
  axios.post.mockResolvedValue({ data: { state: "unavailable" } });
  const res = await get(`/deals/${SLUG}`);
  expect(res.statusCode).toBe(200);
  expect(dataOf(res.body)).toEqual({ state: "unavailable" });
  expect(head(res.body)).toContain("<title>Deal no longer available | Hendrix Ventures Group</title>");
});

test("an unknown slug is a 404 with the same page", async () => {
  axios.post.mockResolvedValue({ data: null });
  const res = await get(`/deals/${SLUG}`);
  expect(res.statusCode).toBe(404);
  expect(dataOf(res.body)).toEqual({ state: "unavailable" });
});

test("a path that is not a slug never reaches the database", async () => {
  const res = await get("/deals/nope");
  expect(res.statusCode).toBe(404);
  expect(axios.post).not.toHaveBeenCalled();
});

test("the slug is read from the original URL when the rewrite hands over another path", async () => {
  axios.post.mockResolvedValue({ data: { state: "live", content: CONTENT } });
  const res = await handler({
    httpMethod: "GET",
    path: "/.netlify/functions/deal-page",
    rawUrl: `https://hendrixventures.com/deals/${SLUG}`,
    headers: {},
  });
  expect(res.statusCode).toBe(200);
  expect(axios.post.mock.calls[0][1]).toEqual({ p_slug: SLUG });
});

test("a database failure says the page couldn't load, not that the deal is gone", async () => {
  axios.post.mockRejectedValue(new Error("timeout"));
  const res = await get(`/deals/${SLUG}`);
  expect(res.statusCode).toBe(503);
  expect(dataOf(res.body)).toEqual({ state: "error" });
});

test("a shell that cannot be fetched serves a plain fallback, still unindexed", async () => {
  axios.post.mockResolvedValue({ data: { state: "live", content: CONTENT } });
  axios.get.mockRejectedValue(new Error("down"));
  const res = await get(`/deals/${SLUG}`);
  expect(res.statusCode).toBe(503);
  expect(res.body).toContain("couldn't load");
  expect(res.body).toContain('content="noindex, nofollow"');
  expect(res.headers["X-Robots-Tag"]).toContain("noindex");
});

test("the shell is fetched from this deploy and kept for the next request", async () => {
  vi.stubEnv("DEPLOY_URL", "https://abc--hvg.netlify.app");
  vi.stubEnv("URL", "https://hendrixventures.com");
  axios.post.mockResolvedValue({ data: { state: "live", content: CONTENT } });
  await get(`/deals/${SLUG}`);
  const res = await get(`/deals/${SLUG}`);
  expect(axios.get).toHaveBeenCalledTimes(1);
  expect(axios.get.mock.calls[0][0]).toBe("https://abc--hvg.netlify.app/deals/shell/");
  expect(head(res.body)).toContain(`href="https://hendrixventures.com/deals/${SLUG}"`);
});

test("HEAD answers without a body; other methods are refused", async () => {
  axios.post.mockResolvedValue({ data: { state: "live", content: CONTENT } });
  const head = await get(`/deals/${SLUG}`, "HEAD");
  expect(head.statusCode).toBe(200);
  expect(head.body).toBe("");
  const post = await get(`/deals/${SLUG}`, "POST");
  expect(post.statusCode).toBe(405);
});

// Review, 2026-11-12: a string replacement reads $' $` $& $$ as patterns, so a price
// in the deal's words could paste the rest of the page into the data and break it.
test("dollar signs in the deal's words reach the page exactly as written", () => {
  const words = { ...CONTENT, locality: "Atlanta $` GA", about: "Seller credit $' extra, pay $$ at close, $& too" };
  const html = renderDealPage({ shell: SHELL, page: { state: "live", slug: SLUG, content: words }, url: "https://hendrixventures.com/deals/x" });
  expect(dataOf(html).content).toEqual(words);
  expect(head(html)).toContain("<title>Off-market deal · Atlanta $` GA | Hendrix Ventures Group</title>");
  expect(html.match(/<\/head>/g)).toHaveLength(1);
});

// The renderer finds its tags by pattern; against the real build, so a layout change
// that moves a tag fails here instead of silently giving every link the site's preview.
import { existsSync, readFileSync } from "node:fs";
const BUILT = new URL("../../dist/deals/shell/index.html", import.meta.url);
test.skipIf(!existsSync(BUILT))("the built shell's every preview tag is filled (needs npm run build)", () => {
  const shell = readFileSync(BUILT, "utf8");
  const html = renderDealPage({ shell, page: { state: "live", slug: SLUG, content: CONTENT }, url: `https://hendrixventures.com/deals/${SLUG}` });
  const h = head(html);
  expect(h).toContain("<title>Off-market deal · Atlanta, GA 30316 | Hendrix Ventures Group</title>");
  expect(h).toContain('<meta name="description" content="Suggested Price $165,000 · Hendrix Ventures Group">');
  expect(h).toContain(`<link rel="canonical" href="https://hendrixventures.com/deals/${SLUG}">`);
  for (const tag of ['property="og:title"', 'property="og:description"', 'property="og:url"', 'property="og:image"', 'name="twitter:title"', 'name="twitter:description"', 'name="twitter:image"']) {
    expect(h, tag).toMatch(new RegExp(`<meta ${tag} content="(?!Investor deal|An off-market deal|https://hendrixventures.com/og-image|https://hendrixventures.com/deals/shell)`));
  }
  expect(h).toContain('<meta name="robots" content="noindex, nofollow">');
  expect(dataOf(html).slug).toBe(SLUG);
});
