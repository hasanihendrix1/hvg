import axios from "axios";
import "dotenv/config";

// /deals/<slug> (netlify.toml rewrites it here): one deal's link-only page.
// The built shell (src/pages/deals/shell.astro) carries the layout and the
// DealPage island; this fills in the link-preview tags and hands the island
// the deal as JSON. deal_page() answers only for an exact slug, so pages
// cannot be listed (supabase/migrations/20261112000100_deal_pages.sql).
const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://ltpiqfgtfdzlgtqdghle.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_MIw-hDdAugdp8ZWpw__t-w_-d8wxhK8";
const SITE = "https://hendrixventures.com";

export const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** The slug in "/deals/<slug>", or null for anything that is not one. */
export function slugFrom(path) {
  const m = /^\/deals\/([^/?#]+)\/?$/.exec(typeof path === "string" ? path : "");
  if (!m) return null;
  return m[1].length >= 16 && m[1].length <= 96 && SLUG.test(m[1]) ? m[1] : null;
}

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// JSON inside <script> must not be able to close the tag or start a comment.
const scriptJson = (v) =>
  JSON.stringify(v)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(new RegExp(String.fromCharCode(0x2028), "g"), "\\u2028")
    .replace(new RegExp(String.fromCharCode(0x2029), "g"), "\\u2029");

const usd = (n) =>
  Number(n).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

const text = (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);

const httpsUrl = (v) => {
  const s = text(v);
  if (!s) return null;
  try {
    return new URL(s).protocol === "https:" ? s : null;
  } catch {
    return null;
  }
};

/**
 * What a texted link previews: the town and the price, never the street
 * (the page itself shows the street to whoever has the link).
 */
export function pageMeta(page) {
  const c = page.state === "live" ? page.content || {} : null;
  const locality = c && text(c.locality);
  const amount = c && c.price && Number(c.price.amount);
  if (!c || !locality || !Number.isFinite(amount) || amount <= 0) {
    return {
      title: "Deal no longer available",
      description:
        "Join the Hendrix Ventures Group buyer list for first look at the next one.",
      image: null,
    };
  }
  const label = c.price.label === "Buy Now" ? "Buy Now" : "Suggested Price";
  return {
    title: `Off-market deal · ${locality}`,
    description: `${label} ${usd(amount)} · Hendrix Ventures Group`,
    image: httpsUrl(c.heroUrl),
  };
}

const setAttr = (html, pattern, value) =>
  html.replace(pattern, (_m, open, close) => `${open}${escapeHtml(value)}${close}`);

/** The shell with this deal's tags and data. Pure, so tests and e2e render exactly what production serves. */
export function renderDealPage({ shell, page, url }) {
  const meta = pageMeta(page);
  const title = `${meta.title} | Hendrix Ventures Group`;
  // Function replacers throughout: a string one reads $' $` $& $$ in the deal's words as patterns.
  let html = shell.replace(/<title>[^<]*<\/title>/, () => `<title>${escapeHtml(title)}</title>`);
  html = setAttr(html, /(<meta\s+name="description"\s+content=")[^"]*(")/, meta.description);
  html = setAttr(html, /(<link\s+rel="canonical"\s+href=")[^"]*(")/, url);
  html = setAttr(html, /(<meta\s+property="og:url"\s+content=")[^"]*(")/, url);
  for (const key of ["og:title", "twitter:title"]) {
    const attr = key.startsWith("og:") ? "property" : "name";
    html = setAttr(html, new RegExp(`(<meta\\s+${attr}="${key}"\\s+content=")[^"]*(")`), meta.title);
  }
  for (const key of ["og:description", "twitter:description"]) {
    const attr = key.startsWith("og:") ? "property" : "name";
    html = setAttr(html, new RegExp(`(<meta\\s+${attr}="${key}"\\s+content=")[^"]*(")`), meta.description);
  }
  if (meta.image) {
    html = setAttr(html, /(<meta\s+property="og:image"\s+content=")[^"]*(")/, meta.image);
    html = setAttr(html, /(<meta\s+name="twitter:image"\s+content=")[^"]*(")/, meta.image);
  }
  const data = `<script type="application/json" id="deal-data">${scriptJson(page)}</script>`;
  return html.replace("</head>", () => `${data}</head>`);
}

// The shell is a static file of the same deploy; one fetch per warm instance.
const SHELL_TTL_MS = 5 * 60 * 1000;
let shellCache = null;

async function loadShell(origin) {
  if (shellCache && shellCache.origin === origin && Date.now() - shellCache.at < SHELL_TTL_MS) {
    return shellCache.html;
  }
  const res = await axios.get(`${origin}/deals/shell/`, {
    responseType: "text",
    transformResponse: (r) => r,
    timeout: 4000,
  });
  if (typeof res.data !== "string" || !res.data.includes('id="deal-page"')) {
    throw new Error("deal page shell is missing its island");
  }
  shellCache = { origin, html: res.data, at: Date.now() };
  return res.data;
}

export function resetShellCache() {
  shellCache = null;
}

const HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  // Link-only: never indexed, and no outbound link or photo request carries the slug.
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
};

const FALLBACK = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Hendrix Ventures Group</title></head><body style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem"><h1>This page couldn't load</h1><p>Try again in a minute, or email <a href="mailto:hasani@hendrixventures.com">hasani@hendrixventures.com</a>.</p></body></html>`;

async function lookUp(slug) {
  const res = await axios.post(
    `${SUPABASE_URL}/rest/v1/rpc/deal_page`,
    { p_slug: slug },
    {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" },
      timeout: 4000,
    }
  );
  return res.data;
}

export const handler = async (event) => {
  if (event.httpMethod !== "GET" && event.httpMethod !== "HEAD") {
    return { statusCode: 405, headers: { Allow: "GET, HEAD" }, body: "Method Not Allowed" };
  }
  let path = event.path;
  if (!slugFrom(path) && event.rawUrl) {
    try {
      path = new URL(event.rawUrl).pathname;
    } catch {
      /* keep event.path */
    }
  }
  const slug = slugFrom(path);
  const publicOrigin = (process.env.URL || SITE).replace(/\/+$/, "");
  const shellOrigin = (process.env.DEPLOY_URL || publicOrigin).replace(/\/+$/, "");
  // The two reads are independent; together they must fit the function's time limit.
  const shellLoad = loadShell(shellOrigin).catch((err) => err);
  let page;
  let statusCode;
  if (!slug) {
    page = { state: "unavailable" };
    statusCode = 404;
  } else {
    try {
      const found = await lookUp(slug);
      if (found && found.state === "live" && found.content) {
        page = { state: "live", slug, content: found.content };
        statusCode = 200;
      } else if (found && found.state === "unavailable") {
        page = { state: "unavailable" };
        statusCode = 200;
      } else {
        page = { state: "unavailable" };
        statusCode = 404;
      }
    } catch (err) {
      console.error("deal_page lookup failed:", err && err.message);
      page = { state: "error" };
      statusCode = 503;
    }
  }

  let html;
  try {
    const shell = await shellLoad;
    if (shell instanceof Error) throw shell;
    html = renderDealPage({ shell, page, url: slug ? `${publicOrigin}/deals/${slug}` : `${publicOrigin}/investors` });
  } catch (err) {
    console.error("deal page shell failed:", err && err.message);
    return { statusCode: 503, headers: HEADERS, body: event.httpMethod === "HEAD" ? "" : FALLBACK };
  }
  return { statusCode, headers: HEADERS, body: event.httpMethod === "HEAD" ? "" : html };
};
