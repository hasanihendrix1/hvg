const axios = require("axios");
require("dotenv").config();

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

exports.handler = async (event) => {
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
    if (missing.length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid buyer data", missing }),
      };
    }

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
          raw: buyerData,
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
