import axios from "axios";
import "dotenv/config";

// PRIMARY lead store: Supabase. The publishable key below is intentionally
// committed — it is public by design (like any client-side API key) and the
// table's row-level security only allows INSERT with it: leads can never be
// read, changed, or deleted using this key (verified: SELECT returns 401).
const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://ltpiqfgtfdzlgtqdghle.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_MIw-hDdAugdp8ZWpw__t-w_-d8wxhK8";

// MIRROR 1 (best-effort): legacy Google Apps Script -> Sheet. Counts toward
// success because a 2xx from script.google.com means the sheet accepted it.
const GOOGLE_SCRIPT_URL = process.env.REACT_APP_GOOGLE_APPS_SCRIPT_URL_LEAD;

// MIRROR 2 (opportunistic ONLY): Netlify Forms. Deliberately excluded from
// the success decision — the SPA catch-all redirect can answer this POST
// with a 200 even when Netlify Forms did not record the submission.
const NETLIFY_FORMS_ORIGIN = process.env.URL || "https://hendrixventures.com";

// Forms completed faster than this are treated as bots. Kept low so that a
// returning visitor who browser-autofills the whole form isn't dropped.
const MIN_FILL_TIME_MS = 2000;
// Sinks run in parallel, so worst-case wall time stays inside Netlify's 10s
// function limit no matter how many sinks hang.
const SINK_TIMEOUT_MS = 3500;
const PG_INT4_MAX = 2147483647;

export const handler = async (event, context) => {
  // Allow only POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }

  try {
    const payload = JSON.parse(event.body);

    // Server-side validation: never trust that the client form ran
    const requiredString = (v) => typeof v === "string" && v.trim() !== "";
    if (
      !requiredString(payload.name) ||
      !requiredString(payload.phone) ||
      !requiredString(payload.address)
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing required fields" }),
      };
    }

    // Spam checks: honeypot filled, or submitted faster than a human could.
    // Respond with a fake success so bots get no signal to adapt to.
    const honeypotFilled =
      typeof payload.fax === "string" && payload.fax.trim() !== "";
    const fillTimeMs = Number(payload.fillTimeMs);
    const suspiciouslyFast =
      !Number.isFinite(fillTimeMs) || fillTimeMs < MIN_FILL_TIME_MS;
    if (honeypotFilled || suspiciouslyFast) {
      console.warn("Dropping suspected spam lead", {
        honeypotFilled,
        fillTimeMs,
      });
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Lead sent successfully" }),
      };
    }

    const lead = {
      name: payload.name,
      phone: payload.phone,
      address: payload.address,
    };
    const receivedAt = new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
    });

    const postSupabase = () =>
      axios.post(
        `${SUPABASE_URL}/rest/v1/seller_leads`,
        {
          ...lead,
          fill_time_ms: Math.min(Math.round(fillTimeMs), PG_INT4_MAX),
          user_agent: event.headers["user-agent"] || null,
          ip: event.headers["x-nf-client-connection-ip"] || null,
          raw: payload,
        },
        {
          headers: {
            apikey: SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          timeout: SINK_TIMEOUT_MS,
        }
      );

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
      postSupabase(),
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
    if (GOOGLE_SCRIPT_URL && !sheetMirrored) {
      console.warn(
        "Sheet mirror failed:",
        sheetResult.reason && sheetResult.reason.message
      );
    }

    // The lead is safe only if a VERIFIABLE destination accepted it
    if (stored || sheetMirrored) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Lead sent successfully" }),
      };
    }
    console.error("All verifiable lead destinations failed");
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to send lead" }),
    };
  } catch (error) {
    console.error("Error sending lead:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to send lead" }),
    };
  }
};
