const axios = require("axios");
require("dotenv").config();

const GOOGLE_SCRIPT_URL = process.env.REACT_APP_GOOGLE_APPS_SCRIPT_URL_LEAD;

// Submissions completed faster than this are treated as bots
const MIN_FILL_TIME_MS = 3000;

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
      typeof payload.website === "string" && payload.website.trim() !== "";
    const elapsedMs = Date.now() - Number(payload.timestamp);
    const suspiciouslyFast =
      !Number.isFinite(elapsedMs) || elapsedMs < MIN_FILL_TIME_MS;
    if (honeypotFilled || suspiciouslyFast) {
      console.warn("Dropping suspected spam lead", {
        honeypotFilled,
        elapsedMs,
      });
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Lead sent successfully" }),
      };
    }

    // The honeypot never belongs in the sheet; format the timestamp for it
    delete payload.website;
    payload.timestamp = new Date(Number(payload.timestamp)).toLocaleString(
      "en-US",
      { timeZone: "America/New_York" }
    );

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
