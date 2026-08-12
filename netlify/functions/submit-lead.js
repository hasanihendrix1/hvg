import axios from "axios";
import "dotenv/config";

// PRIMARY lead store: Supabase. The publishable key is committed on purpose —
// public by design; row-level security permits INSERT only (reads denied).
const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://ltpiqfgtfdzlgtqdghle.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_MIw-hDdAugdp8ZWpw__t-w_-d8wxhK8";

// Best-effort mirrors for COMPLETE leads (never fatal; form mirror is
// excluded from the success decision — the SPA catch-all can fake its 200)
const GOOGLE_SCRIPT_URL = process.env.REACT_APP_GOOGLE_APPS_SCRIPT_URL_LEAD;
const NETLIFY_FORMS_ORIGIN = process.env.URL || "https://hendrixventures.com";

const MIN_FILL_TIME_MS = 2000;
const SINK_TIMEOUT_MS = 3500;
const PG_INT4_MAX = 2147483647;

// ⚖ Consent language lives here so every stored lead records exactly which
// version the seller saw. Bump the version whenever the text changes.
// Keep in sync with src/islands/OfferForm.tsx.
export const CONSENT_VERSION = "2026-08-12.1";
export const CONSENT_TEXT = {
  transactional:
    "I agree to receive calls and text messages from Hendrix Ventures Group LLC about my request at the number provided. Msg frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help.",
  marketing:
    "(Optional) I'd also like occasional updates about buying or selling property. I agree to receive recurring marketing calls and text messages (including via automated technology) from Hendrix Ventures Group LLC at the number provided. Consent is not a condition of receiving an offer or of any purchase.",
};

const requiredString = (v) => typeof v === "string" && v.trim() !== "";
const PHONE_REGEX =
  /^(?:\+?1[-. ]?)?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const payload = JSON.parse(event.body);
    const stage = payload.stage === "partial" ? "partial" : "complete";

    if (!requiredString(payload.address)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing required fields" }),
      };
    }

    // Honeypot applies to every stage; fake success so bots learn nothing
    if (typeof payload.fax === "string" && payload.fax.trim() !== "") {
      console.warn("Dropping suspected spam lead (honeypot)", { stage });
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    const common = {
      stage,
      submission_id: payload.submissionId || null,
      address: payload.address,
      page_url: payload.pageUrl || null,
      utm: payload.utm || null,
      user_agent: event.headers["user-agent"] || null,
      ip: event.headers["x-nf-client-connection-ip"] || null,
      source: "website-v2",
    };

    const insert = (row) =>
      axios.post(`${SUPABASE_URL}/rest/v1/seller_leads`, row, {
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        timeout: SINK_TIMEOUT_MS,
      });

    // ---- Stage 1: partial capture (address only; Supabase only) ----
    if (stage === "partial") {
      await insert({
        ...common,
        name: "(partial — address only)",
        phone: "(partial)",
        raw: payload,
      });
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    // ---- Stage 2: complete lead ----
    if (!requiredString(payload.name) || !requiredString(payload.phone)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing required fields" }),
      };
    }
    if (!PHONE_REGEX.test(payload.phone.trim())) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid phone number" }),
      };
    }

    const fillTimeMs = Number(payload.fillTimeMs);
    if (!Number.isFinite(fillTimeMs) || fillTimeMs < MIN_FILL_TIME_MS) {
      console.warn("Dropping suspected spam lead (fill time)", { fillTimeMs });
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    const lead = {
      name: payload.name,
      phone: payload.phone,
      address: payload.address,
    };
    const receivedAt = new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
    });

    const postSheet = () =>
      axios.post(
        GOOGLE_SCRIPT_URL,
        { ...lead, timestamp: receivedAt },
        {
          headers: { "Content-Type": "application/json" },
          timeout: SINK_TIMEOUT_MS,
        }
      );

    const postNetlifyForm = () =>
      axios.post(
        `${NETLIFY_FORMS_ORIGIN}/`,
        new URLSearchParams({ "form-name": "seller-lead", ...lead }).toString(),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: SINK_TIMEOUT_MS,
        }
      );

    const [storeResult, sheetResult] = await Promise.allSettled([
      insert({
        ...common,
        ...lead,
        email: requiredString(payload.email) ? payload.email : null,
        timeline: requiredString(payload.timeline) ? payload.timeline : null,
        fill_time_ms: Math.min(Math.round(fillTimeMs), PG_INT4_MAX),
        consent_transactional: payload.consentTransactional === true,
        consent_marketing: payload.consentMarketing === true,
        consent_version: CONSENT_VERSION,
        consent_text: JSON.stringify(CONSENT_TEXT),
        raw: payload,
      }),
      GOOGLE_SCRIPT_URL ? postSheet() : Promise.resolve("skipped"),
      postNetlifyForm(),
    ]);

    const stored = storeResult.status === "fulfilled";
    if (!stored) {
      const r = storeResult.reason;
      console.error(
        "Supabase insert failed:",
        r && r.response
          ? `${r.response.status} ${JSON.stringify(r.response.data)}`
          : r && r.message
      );
    }
    const sheetMirrored =
      Boolean(GOOGLE_SCRIPT_URL) && sheetResult.status === "fulfilled";

    if (stored || sheetMirrored) {
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }
    console.error("All verifiable lead destinations failed");
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to send lead" }),
    };
  } catch (error) {
    console.error("Error in submit-lead:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to send lead" }),
    };
  }
};
