// One deal's page content, as dotato writes it to bridge_deal_pages.content
// (dotato lib/deals/site/page-content.ts builds it). The page trusts none of
// it blindly: readDealPage keeps only well-formed values, so a field dotato
// adds later or a bad value never breaks the page.

export interface DealPhoto {
  /** Google Drive file id in his shared folder */
  id: string;
  name: string | null;
}

export interface DealPageContent {
  street: string;
  /** "Atlanta, GA 30316" */
  locality: string;
  /** "Single Family · 3 bed · 2 bath · 1,320 sqft · built 1958" */
  facts: string | null;
  /** "Delivered Vacant", or null when he has not confirmed it */
  occupancy: string | null;
  price: { label: "Suggested Price" | "Buy Now"; amount: number };
  /** Only when the comp run rated the ARV high confidence (owner, 2026-11-12) */
  arv: number | null;
  about: string | null;
  mustRead: string[];
  terms: string[];
  disclaimer: string | null;
  heroUrl: string | null;
  photos: DealPhoto[];
  photosFolderUrl: string | null;
  /** E.164 call/text number */
  phone: string | null;
  /** The offer form's earnest-money default, in dollars */
  deposit: number | null;
  /** The offer form's close-by default, YYYY-MM-DD */
  closeBy: string | null;
}

export type DealPageState =
  | { state: "live"; slug: string; content: DealPageContent }
  | { state: "unavailable" }
  | { state: "error" };

const str = (v: unknown, max = 2000): string | null =>
  typeof v === "string" && v.trim() !== "" ? v.trim().slice(0, max) : null;

const money = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : Number.NaN;
  return Number.isFinite(n) && n > 0 && n < 100_000_000 ? Math.round(n) : null;
};

const httpsUrl = (v: unknown): string | null => {
  const s = str(v, 2000);
  if (!s) return null;
  try {
    return new URL(s).protocol === "https:" ? s : null;
  } catch {
    return null;
  }
};

const DRIVE_ID = /^[A-Za-z0-9_-]{10,200}$/;
const E164 = /^\+1[2-9][0-9]{2}[2-9][0-9]{6}$/;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** The page's content, or null when it is missing what every page needs. */
export function readDealContent(raw: unknown): DealPageContent | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const street = str(r.street, 200);
  const locality = str(r.locality, 200);
  const p = (r.price ?? {}) as Record<string, unknown>;
  const amount = money(p.amount);
  if (!street || !locality || amount === null) return null;
  const list = (v: unknown, max: number) =>
    Array.isArray(v)
      ? v.map((x) => str(x, 2000)).filter((x): x is string => x !== null).slice(0, max)
      : [];
  const photos = Array.isArray(r.photos)
    ? r.photos
        .map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : {}))
        .filter((x) => typeof x.id === "string" && DRIVE_ID.test(x.id))
        .map((x) => ({ id: x.id as string, name: str(x.name, 200) }))
        .slice(0, 200)
    : [];
  const phone = str(r.phone, 20);
  const closeBy = str(r.closeBy, 10);
  return {
    street,
    locality,
    facts: str(r.facts, 300),
    occupancy: str(r.occupancy, 100),
    price: { label: p.label === "Buy Now" ? "Buy Now" : "Suggested Price", amount },
    arv: money(r.arv),
    about: str(r.about, 4000),
    mustRead: list(r.mustRead, 10),
    terms: list(r.terms, 10),
    disclaimer: str(r.disclaimer, 2000),
    heroUrl: httpsUrl(r.heroUrl),
    photos,
    photosFolderUrl: httpsUrl(r.photosFolderUrl),
    phone: phone && E164.test(phone) ? phone : null,
    deposit: money(r.deposit),
    closeBy: closeBy && ISO_DAY.test(closeBy) ? closeBy : null,
  };
}

/** What the server put in the page's #deal-data script, read defensively. */
export function readDealPageState(raw: unknown): DealPageState {
  if (!raw || typeof raw !== "object") return { state: "unavailable" };
  const r = raw as Record<string, unknown>;
  if (r.state === "error") return { state: "error" };
  if (r.state !== "live" || typeof r.slug !== "string") return { state: "unavailable" };
  const content = readDealContent(r.content);
  return content ? { state: "live", slug: r.slug, content } : { state: "unavailable" };
}

export const usd = (n: number): string =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** "+14705550123" → "(470) 555-0123" */
export const phoneDisplay = (e164: string): string =>
  `(${e164.slice(2, 5)}) ${e164.slice(5, 8)}-${e164.slice(8)}`;

/** A shared Drive photo, sized for the page; the folder must be "Anyone with the link". */
export const drivePhotoUrl = (id: string, width = 1600): string =>
  `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w${width}`;
