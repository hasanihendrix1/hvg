const axios = require("axios");
require("dotenv").config();

exports.handler = async () => {
  try {
    // Sanity API URL
    const SANITY_API_URL = process.env.REACT_APP_SANITY_URL;
    if (!SANITY_API_URL) {
      throw new Error(
        "Sanity API URL is not configured. Please set REACT_APP_SANITY_URL environment variable."
      );
    }

    // GROQ query to fetch deals
    const query = `*[_type == "deal"]{
      _id,
      timestamp,
      "price": price,
      status,
      address,
      bedrooms,
      bathrooms,
      sqft,
      "image": image.asset->url,
      "mediaLink": mediaLink
    }`;

    // Make a GET request to the Sanity API
    const response = await axios.get(SANITY_API_URL, {
      params: { query },
    });

    // Georgia deals only (the St. Louis record never closed — owner
    // directive 2026-08-12; excluded here until deleted in Sanity)
    const deals = (response.data.result || []).filter(
      (d) => d.address && /\bGA\b/.test(d.address)
    );

    return {
      statusCode: 200,
      body: JSON.stringify(deals),
    };
  } catch (error) {
    console.error("Error fetching deals from Sanity:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to fetch deals", error }),
    };
  }
};
