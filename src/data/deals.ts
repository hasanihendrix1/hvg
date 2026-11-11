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

export interface AddressParts {
  street: string;
  /** Empty when the street and city could not be told apart */
  city: string;
  /** Everything after the street: "Atlanta, GA 30314" */
  locality: string;
  full: string;
}

const STATE_ZIP = /^(.*?),\s*([A-Z]{2}),?\s*(\d{5}(?:-\d{4})?)?$/;
const SUFFIX = "Dr|Rd|Ln|St|Ave|Avenue|Trl|Ter|Terrace|Ct|Way|Blvd|Pl|Cir|Hwy|Pkwy";
// Last street suffix wins, so "12 St Charles Ave NE Atlanta" keeps its "St".
const STREET_THEN_CITY = new RegExp(
  `^(.*\\b(?:${SUFFIX})\\b\\.?(?:\\s+(?:NE|NW|SE|SW)(?![a-z]))?)\\s*(\\S.*)$`
);
// Two in a row ("Avenue St Louis"): the second is the city's "Saint".
const SUFFIX_PAIR = new RegExp(`\\b(?:${SUFFIX})\\.?\\s+(?:${SUFFIX})\\.?$`);
// "92 Douglasville" (after "Hwy") or "Apt 4 Atlanta" is a bad split, not a city.
const CITY_NAME = /^[A-Za-z][A-Za-z .'-]*$/;
const NOT_A_CITY = /^(?:(?:NE|NW|SE|SW)$|(?:Apt|Unit|Ste|Suite|Bldg|Lot)\b)/;

// The records' addresses are typed by hand: the comma between street and city
// comes and goes, and one runs the two together ("Terrace NWAtlanta"). A wrong
// split would show a confident, wrong city, so anything unclear stays as typed.
export function formatAddress(raw: string | null | undefined): AddressParts {
  const typed = (raw ?? "").trim();
  const tail = STATE_ZIP.exec(typed);
  if (!tail) return { street: typed, city: "", locality: "", full: typed };

  const head = tail[1].trim();
  const region = [tail[2], tail[3]].filter(Boolean).join(" ");
  const comma = head.lastIndexOf(",");
  const split =
    comma >= 0
      ? [head.slice(0, comma), head.slice(comma + 1)]
      : STREET_THEN_CITY.exec(head)?.slice(1, 3);
  const [first, second = ""] = split?.map((part) => part.trim()) ?? [];
  const isCity =
    CITY_NAME.test(second) &&
    !NOT_A_CITY.test(second) &&
    !(comma < 0 && SUFFIX_PAIR.test(first));
  const [street, city] = isCity ? [first, second] : [head, ""];
  const locality = city ? `${city}, ${region}` : region;
  return { street, city, locality, full: `${street}, ${locality}` };
}

export async function fetchDeals(): Promise<Deal[]> {
  const res = await fetch(SANITY_URL);
  if (!res.ok) {
    // Hard-fail the build rather than shipping an empty proof page
    throw new Error(`Sanity query failed: ${res.status}`);
  }
  const data = await res.json();
  const deals: Deal[] = data.result || [];
  // Georgia transactions only. (Also excludes the St. Louis record, which
  // never closed — owner directive 2026-08-12; pending deletion in Sanity.)
  return deals
    .filter((d) => d.address && /\bGA\b/.test(d.address))
    .sort((a, b) => quarterValue(b.timestamp) - quarterValue(a.timestamp));
}
