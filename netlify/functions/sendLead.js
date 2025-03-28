const axios = require("axios");
require("dotenv").config();

const GOOGLE_SCRIPT_URL = process.env.REACT_APP_GOOGLE_APPS_SCRIPT_URL_LEAD;

exports.handler = async (event, context) => {
  // Allow only POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }

  try {
    // Parse the incoming payload (assuming JSON)
    const payload = JSON.parse(event.body);

    // Send the payload to the Google Apps Script using axios POST
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
      body: JSON.stringify({
        message: "Failed to send lead",
        error: error.message,
      }),
    };
  }
};
