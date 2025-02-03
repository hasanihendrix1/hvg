const axios = require("axios");
require("dotenv").config();

const GOOGLE_SCRIPT_URL = process.env.REACT_APP_GOOGLE_APPS_SCRIPT_URL_BUYER;

exports.handler = async (event) => {
  try {
    const buyerData = JSON.parse(event.body);
    if (!buyerData || typeof buyerData !== "object") {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid buyer data" }),
      };
    }
    const response = await axios.post(GOOGLE_SCRIPT_URL, buyerData, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Success", data: response.data }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error", error: error.message }),
    };
  }
};
