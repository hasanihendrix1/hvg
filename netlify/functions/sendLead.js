const axios = require("axios");
require("dotenv").config();

const GOOGLE_SCRIPT_URL = process.env.REACT_APP_GOOGLE_APPS_SCRIPT_URL_LEAD;

// Forms completed faster than this are treated as bots. Kept low so that a
// returning visitor who browser-autofills the whole form isn't dropped.
const MIN_FILL_TIME_MS = 2000;

exports.handler = async (event, context) => {
  // Allow only POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }

  try {
    const payload = JSON.parse(event.body);

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

    // Spam-check fields never belong in the sheet; stamp the lead with the
    // server's receipt time (client clocks are unreliable)
    delete payload.fax;
    delete payload.fillTimeMs;
    payload.timestamp = new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
    });

    const response = await axios.post(GOOGLE_SCRIPT_URL, payload, {
      headers: { "Content-Type": "application/json" },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Lead sent successfully",
        googleResponse: response.data,
      }),
    };
  } catch (error) {
    console.error("Error sending lead:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to send lead" }),
    };
  }
};
