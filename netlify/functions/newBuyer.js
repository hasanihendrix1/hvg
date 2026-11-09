import axios from "axios";
import { randomUUID } from "node:crypto";
import "dotenv/config";

// PRIMARY store: Supabase. Publishable key is committed on purpose — it is
// public by design and row-level security only permits INSERT with it.
const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://ltpiqfgtfdzlgtqdghle.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_MIw-hDdAugdp8ZWpw__t-w_-d8wxhK8";

// Best-effort mirrors. The sheet counts toward success; Netlify Forms is
// opportunistic only (the SPA catch-all can fake a 200 for it).
const GOOGLE_SCRIPT_URL = process.env.REACT_APP_GOOGLE_APPS_SCRIPT_URL_BUYER;
const NETLIFY_FORMS_ORIGIN = process.env.URL || "https://hendrixventures.com";

const SINK_TIMEOUT_MS = 3500;

// ⚖ The buyer form's required box, as shown by src/islands/BuyerSignup.tsx
// (tests/consent-sync.test.mjs fails if they differ). Calls and emails only:
// texting investors needs its own A2P campaign first (README TODO).
export const BUYER_CONSENT_TEXT =
  "I agree to receive calls and emails from Hendrix Ventures Group LLC about investment inventory.";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }

  try {
    const buyerData = JSON.parse(event.body);
    if (!buyerData || typeof buyerData !== "object") {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid buyer data" }),
      };
    }

    // BuyerForm sends the phone as `number` (legacy CRM naming); accept
    // `contact` too so nothing breaks if the client is ever cleaned up.
    const contact = buyerData.number || buyerData.contact;
    const requiredString = (v) => typeof v === "string" && v.trim() !== "";
    const missing = [];
    if (!requiredString(buyerData.firstName)) missing.push("firstName");
    if (!requiredString(buyerData.lastName)) missing.push("lastName");
    if (!requiredString(contact)) missing.push("number");
    if (!requiredString(buyerData.email)) missing.push("email");
    if (buyerData.consentMarketing !== true) missing.push("consent");
    if (missing.length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid buyer data", missing }),
      };
    }

    // Shared by the website's record and dotato's, so the two can be matched;
    // dotato also uses it to recognise a redelivery.
    const submissionId = randomUUID();
    // Read per call so a deploy can switch it on without a code change.
    const dotatoUrl = process.env.DOTATO_BUYERS_WEBHOOK_URL;

    const postSupabase = () =>
      axios.post(
        `${SUPABASE_URL}/rest/v1/investor_signups`,
        {
          first_name: buyerData.firstName,
          last_name: buyerData.lastName,
          contact,
          email: buyerData.email,
          market: buyerData.market || null,
          buyer_type: buyerData.buyerType || null,
          user_agent: event.headers["user-agent"] || null,
          ip: event.headers["x-nf-client-connection-ip"] || null,
          raw: { ...buyerData, submissionId },
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
      axios.post(GOOGLE_SCRIPT_URL, buyerData, {
        headers: { "Content-Type": "application/json" },
        timeout: SINK_TIMEOUT_MS,
      });

    const postNetlifyForm = () =>
      axios.post(
        `${NETLIFY_FORMS_ORIGIN}/`,
        new URLSearchParams({
          "form-name": "investor-signup",
          firstName: buyerData.firstName,
          lastName: buyerData.lastName,
          contact,
          email: buyerData.email,
          market: buyerData.market || "",
          buyerType: buyerData.buyerType || "",
        }).toString(),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: SINK_TIMEOUT_MS,
        }
      );

    // Opportunistic like the Netlify form: never part of the success decision,
    // because the website's own store is the source of truth.
    const postDotato = () =>
      axios.post(
        dotatoUrl,
        {
          submissionId,
          firstName: buyerData.firstName,
          lastName: buyerData.lastName,
          phone: contact,
          email: buyerData.email,
          buyerType: buyerData.buyerType || null,
          consentCallsEmail: true,
          consentText: BUYER_CONSENT_TEXT,
          receivedAt: new Date().toISOString(),
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: SINK_TIMEOUT_MS,
        }
      );

    const [storeResult, sheetResult, , dotatoResult] = await Promise.allSettled([
      postSupabase(),
      GOOGLE_SCRIPT_URL ? postSheet() : Promise.resolve("skipped"),
      postNetlifyForm(),
      dotatoUrl ? postDotato() : Promise.resolve("skipped"),
    ]);
    if (dotatoResult.status === "rejected") {
      console.warn(
        "dotato buyer mirror failed:",
        dotatoResult.reason && dotatoResult.reason.message
      );
    }

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
        "Buyer sheet mirror failed:",
        sheetResult.reason && sheetResult.reason.message
      );
    }

    if (stored || sheetMirrored) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Success" }),
      };
    }
    console.error("All verifiable buyer destinations failed");
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error" }),
    };
  } catch (error) {
    console.error("Error handling buyer signup:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error" }),
    };
  }
};
