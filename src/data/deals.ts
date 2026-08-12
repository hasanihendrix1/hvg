// Build-time fetch of the documented purchases from Sanity (public dataset,
// no credentials — free route). The page is static; deals change rarely and
// a redeploy refreshes them.

export interface Deal {
  _id: string;
  timestamp: string; // "2021-Q1"
  price: string;
  status: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  image: string | null;
  mediaLink?: string;
}

const QUERY = encodeURIComponent(`*[_type == "deal"]{
  _id, timestamp, "price": price, status, address, bedrooms, bathrooms, sqft,
  "image": image.asset->url
}`);

const SANITY_URL = `https://znwkqpl5.api.sanity.io/v2023-01-01/data/query/production?query=${QUERY}`;

const quarterValue = (timestamp: string): number => {
  const [year, q] = timestamp.split("-Q");
  return Number(year) * 4 + (Number(q) || 0);
};

export const quarterLabel = (timestamp: string): string =>
  timestamp.replace("-Q", " Q");

export async function fetchDeals(): Promise<Deal[]> {
  const res = await fetch(SANITY_URL);
  if (!res.ok) {
    // Hard-fail the build rather than shipping an empty proof page
    throw new Error(`Sanity query failed: ${res.status}`);
  }
  const data = await res.json();
  const deals: Deal[] = data.result || [];
  return deals
    .filter((d) => d.address)
    .sort((a, b) => quarterValue(b.timestamp) - quarterValue(a.timestamp));
}
