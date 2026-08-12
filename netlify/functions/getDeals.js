import axios from "axios";
import "dotenv/config";

// Live inventory bridge (dotato -> HVG): read-only view of active deals
// pushed by dotato when leads go under contract. Publishable key can only
// SELECT active rows on this one table.
const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://ltpiqfgtfdzlgtqdghle.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_MIw-hDdAugdp8ZWpw__t-w_-d8wxhK8";

const toQuarter = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "2026-Q1";
  return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
};

export const handler = async () => {
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

    // Historical record (Sanity) + live bridge inventory, in parallel.
    // The bridge is best-effort: if it fails, history still serves.
    const [sanityResult, bridgeResult] = await Promise.allSettled([
      axios.get(SANITY_API_URL, { params: { query }, timeout: 6000 }),
      axios.get(
        `${SUPABASE_URL}/rest/v1/bridge_deals?select=*&active=eq.true&order=updated_at.desc`,
        {
          headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
          timeout: 4000,
        }
      ),
    ]);

    if (sanityResult.status === "rejected" && bridgeResult.status === "rejected") {
      throw sanityResult.reason;
    }

    // Georgia deals only (the St. Louis record never closed — owner
    // directive 2026-08-12; excluded here until deleted in Sanity)
    const historical =
      sanityResult.status === "fulfilled"
        ? (sanityResult.value.data.result || []).filter(
            (d) => d.address && /\bGA\b/.test(d.address)
          )
        : [];

    const live =
      bridgeResult.status === "fulfilled"
        ? (bridgeResult.value.data || []).map((b) => ({
            _id: `bridge-${b.id}`,
            timestamp: toQuarter(b.created_at),
            price: b.price,
            status: b.status, // 'Available' | 'Pending'
            address: b.address,
            bedrooms: b.bedrooms,
            bathrooms: b.bathrooms,
            sqft: b.sqft,
            image: b.image_url,
            mediaLink: b.media_link,
          }))
        : [];
    if (bridgeResult.status === "rejected") {
      console.warn("Bridge fetch failed:", bridgeResult.reason?.message);
    }

    // Live inventory first, then the historical record
    return {
      statusCode: 200,
      body: JSON.stringify([...live, ...historical]),
    };
  } catch (error) {
    console.error("Error fetching deals:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to fetch deals" }),
    };
  }
};
