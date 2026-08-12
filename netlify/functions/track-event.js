import axios from "axios";
import "dotenv/config";

// First-party, cookieless analytics sink (owner free-route directive — no
// third-party trackers). Insert-only key; events can never be read back
// with it.
const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://ltpiqfgtfdzlgtqdghle.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_MIw-hDdAugdp8ZWpw__t-w_-d8wxhK8";

const ALLOWED_EVENTS = new Set([
  "page_view",
  "form_start",
  "step1_complete",
  "step2_complete",
  "submit_error",
  "call_click",
  "video_play",
]);

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  try {
    const payload = JSON.parse(event.body);
    if (!ALLOWED_EVENTS.has(payload.event)) {
      return { statusCode: 400, body: JSON.stringify({ ok: false }) };
    }
    await axios.post(
      `${SUPABASE_URL}/rest/v1/site_events`,
      {
        event: payload.event,
        path: typeof payload.path === "string" ? payload.path.slice(0, 500) : null,
        meta: payload.meta || null,
        user_agent: event.headers["user-agent"] || null,
        ip: event.headers["x-nf-client-connection-ip"] || null,
      },
      {
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        timeout: 3000,
      }
    );
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (error) {
    // Analytics must never break anything; swallow and report ok
    console.warn("track-event failed:", error && error.message);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }
};
