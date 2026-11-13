import axios from "axios";
import { createHmac } from "node:crypto";
import "dotenv/config";

// A deal page's "I'm interested" and offers (src/islands/DealPage.tsx), signed
// and sent to dotato's deal-site webhook. Unlike the buyer list, dotato is the
// only record: the buyer is told plainly when it did not get there.

// ⚖ Copies of src/data/consent.ts, sent as the evidence of what the buyer saw
// (tests/consent-sync.test.mjs fails if they differ).
export const BUYER_CONSENT_TEXT =
  "I agree to receive calls and emails from Hendrix Ventures Group LLC about investment inventory.";
export const BUYER_DEAL_ALERTS_CONSENT_VERSION = "2026-11-11.1";
export const BUYER_DEAL_ALERTS_CONSENT_TEXT =
  "I agree to receive recurring promotional text messages from Hendrix Ventures Group LLC with deal alerts about investment properties we have available, at the number provided. Msg frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help. Deal alerts are optional and not required to join the buyer list.";
export const BUYER_DEAL_UPDATES_CONSENT_VERSION = "2026-11-11.1";
export const BUYER_DEAL_UPDATES_CONSENT_TEXT =
  "I agree to receive text messages from Hendrix Ventures Group LLC with updates on deals I respond to, such as walkthrough times and offer status, at the number provided. Msg frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help. Deal updates are optional and not required to join the buyer list.";

const MIN_FILL_TIME_MS = 2000;
const DOTATO_TIMEOUT_MS = 8000;

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PHONE =
  /^(?:\+?1[-. ]?)?\(?([2-9][0-9]{2})\)?[-. ]?([2-9][0-9]{2})[-. ]?([0-9]{4})$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DAY = /^20\d{2}-\d{2}-\d{2}$/;

// A real calendar day this century: "2026-02-31" has the shape and no date, and the database refuses it.
const isCalendarDay = (s) => {
  if (!ISO_DAY.test(s)) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

const text = (v, max) =>
  typeof v === "string" && v.trim() !== "" && v.trim().length <= max ? v.trim() : null;

const wholeDollars = (v, min, max) =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : null;

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body),
});

/**
 * The submission as dotato takes it, or the first thing wrong with it. An offer
 * never goes without its site-unseen answer (owner, 2026-11-10), and a site-unseen
 * one never goes without the buyer's acknowledgment.
 */
export function validateResponse(p) {
  if (!p || typeof p !== "object") return { ok: false, reason: "invalid" };
  const slug = typeof p.slug === "string" && p.slug.length >= 16 && p.slug.length <= 96 && SLUG.test(p.slug) ? p.slug : null;
  if (!slug) return { ok: false, reason: "slug" };
  if (p.kind !== "interested" && p.kind !== "offer") return { ok: false, reason: "kind" };
  if (typeof p.submissionId !== "string" || !UUID.test(p.submissionId)) return { ok: false, reason: "submissionId" };
  const firstName = text(p.firstName, 80);
  const lastName = text(p.lastName, 80);
  if (!firstName || !lastName) return { ok: false, reason: "name" };
  const phone = text(p.phone, 30);
  if (!phone || !PHONE.test(phone)) return { ok: false, reason: "phone" };
  const email = text(p.email, 254);
  if (!email || !EMAIL.test(email)) return { ok: false, reason: "email" };
  if (p.consentCallsEmail !== true) return { ok: false, reason: "consent" };

  let offer = null;
  if (p.kind === "offer") {
    const o = p.offer && typeof p.offer === "object" ? p.offer : {};
    if (typeof o.siteUnseen !== "boolean") return { ok: false, reason: "siteUnseen" };
    if (o.siteUnseen && o.acknowledgedUnseen !== true) return { ok: false, reason: "acknowledgment" };
    const amount = wholeDollars(o.amount, 1000, 50_000_000);
    if (amount === null) return { ok: false, reason: "amount" };
    const emd = o.emd == null ? null : wholeDollars(o.emd, 0, 5_000_000);
    if (o.emd != null && emd === null) return { ok: false, reason: "emd" };
    const closeBy = o.closeBy == null || o.closeBy === "" ? null : text(o.closeBy, 10);
    if (closeBy !== null && !isCalendarDay(closeBy)) return { ok: false, reason: "closeBy" };
    if (o.notes != null && typeof o.notes !== "string") return { ok: false, reason: "notes" };
    const notes = typeof o.notes === "string" ? o.notes.trim().slice(0, 1000) || null : null;
    offer = { siteUnseen: o.siteUnseen, amount, emd, closeBy, notes };
  }

  return {
    ok: true,
    body: {
      submissionId: p.submissionId,
      slug,
      kind: p.kind,
      firstName,
      lastName,
      phone,
      email,
      buyerType: null,
      consentCallsEmail: true,
      consentText: BUYER_CONSENT_TEXT,
      consentDealAlerts: p.consentDealAlerts === true,
      dealAlertsConsentVersion: BUYER_DEAL_ALERTS_CONSENT_VERSION,
      dealAlertsConsentText: BUYER_DEAL_ALERTS_CONSENT_TEXT,
      consentDealUpdates: p.consentDealUpdates === true,
      dealUpdatesConsentVersion: BUYER_DEAL_UPDATES_CONSENT_VERSION,
      dealUpdatesConsentText: BUYER_DEAL_UPDATES_CONSENT_TEXT,
      offer,
      receivedAt: new Date().toISOString(),
    },
  };
}

/** dotato checks this: HMAC-SHA256 over "<timestamp>.<body>" with the shared secret. */
export function sign(secret, timestamp, body) {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: { Allow: "POST" }, body: "Method Not Allowed" };
  }
  let payload;
  try {
    payload = JSON.parse(event.body || "");
  } catch {
    return json(400, { message: "invalid" });
  }
  // Fake success, so a bot learns nothing.
  if (payload && typeof payload.fax === "string" && payload.fax.trim() !== "") {
    console.warn("Dropping suspected spam deal response (honeypot)");
    return json(200, { ok: true });
  }
  const fillTimeMs = Number(payload && payload.fillTimeMs);
  if (!Number.isFinite(fillTimeMs) || fillTimeMs < MIN_FILL_TIME_MS) {
    console.warn("Dropping suspected spam deal response (fill time)", { fillTimeMs });
    return json(200, { ok: true });
  }

  const checked = validateResponse(payload);
  if (!checked.ok) return json(400, { message: "invalid", field: checked.reason });

  const url = process.env.DOTATO_DEAL_SITE_WEBHOOK_URL;
  const secret = process.env.DOTATO_DEAL_SITE_SECRET;
  if (!url || !secret) {
    console.error("Deal responses are not set up: DOTATO_DEAL_SITE_WEBHOOK_URL or DOTATO_DEAL_SITE_SECRET is missing");
    return json(503, { message: "unavailable" });
  }

  const body = JSON.stringify(checked.body);
  const timestamp = String(Math.floor(Date.now() / 1000));
  try {
    await axios.post(url, body, {
      headers: {
        "Content-Type": "application/json",
        "X-Deal-Site-Timestamp": timestamp,
        "X-Deal-Site-Signature": `v1=${sign(secret, timestamp, body)}`,
      },
      timeout: DOTATO_TIMEOUT_MS,
      transformRequest: (d) => d,
      // A redirect would turn the signed POST into a GET that reads as success.
      maxRedirects: 0,
    });
    return json(200, { ok: true });
  } catch (err) {
    const status = err && err.response && err.response.status;
    // Only dotato's own "no such deal" means gone; a 404 is a webhook that is off or misaddressed.
    if (status === 410) return json(410, { message: "gone" });
    console.error("dotato deal response failed:", status || (err && err.message));
    return json(502, { message: "failed" });
  }
};
