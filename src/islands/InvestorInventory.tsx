import React, { useEffect, useMemo, useState } from "react";
import "../styles/investor.css";

interface Deal {
  _id: string;
  timestamp: string;
  price: string;
  status: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  image: string | null;
  mediaLink?: string;
}

const quarterValue = (t: string) => {
  const [y, q] = t.split("-Q");
  return Number(y) * 4 + (Number(q) || 0);
};

const formatPrice = (p: string) => {
  const n = Number(p);
  return Number.isFinite(n)
    ? n.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      })
    : p;
};

// Hand-entered history has typos (one record says -2 baths); a fact that
// can't be right is left out rather than shown.
const formatDetails = (d: Deal) => {
  const parts: string[] = [];
  const count = (n: number, one: string, many: string) =>
    Number.isFinite(n) && n > 0 ? `${n} ${n === 1 ? one : many}` : null;
  const beds = count(Number(d.bedrooms), "bed", "beds");
  const baths = count(Number(d.bathrooms), "bath", "baths");
  const sqft = Number(d.sqft);
  if (beds) parts.push(beds);
  if (baths) parts.push(baths);
  if (Number.isFinite(sqft) && sqft > 0)
    parts.push(`${sqft.toLocaleString("en-US")} sq ft`);
  return parts;
};

const statusSlug = (s: string) => (s || "").toLowerCase().replace(/\s+/g, "-");

function Skeleton() {
  return (
    <div aria-busy="true">
      <p className="sr-only" role="status">
        Loading inventory…
      </p>
      <div className="inv-toolbar inv-skel-toolbar" aria-hidden="true">
        <span className="inv-skel-line w-20" />
      </div>
      <ul className="inv-grid" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <li key={i} className="inv-skel">
            <div className="inv-skel-media" />
            <div className="inv-skel-body">
              <span className="inv-skel-line w-40" />
              <span className="inv-skel-line w-80" />
              <span className="inv-skel-line w-60" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function InvestorInventory() {
  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch("/.netlify/functions/getDeals")
      .then((r) => {
        if (!r.ok) throw new Error(`getDeals ${r.status}`);
        return r.json();
      })
      .then((data: Deal[]) =>
        setDeals(
          [...data].sort(
            (a, b) => quarterValue(b.timestamp) - quarterValue(a.timestamp)
          )
        )
      )
      .catch((e) => {
        console.error("Inventory fetch failed:", e);
        setError(true);
      });
  }, []);

  const statuses = useMemo(
    () =>
      deals
        ? [...new Set(deals.map((d) => d.status).filter(Boolean))].sort()
        : [],
    [deals]
  );

  const shown = useMemo(
    () =>
      !deals
        ? []
        : filter
          ? deals.filter(
              (d) => (d.status || "").toLowerCase() === filter.toLowerCase()
            )
          : deals,
    [deals, filter]
  );

  if (error) {
    return (
      <p className="inv-note" role="alert">
        The inventory couldn't load just now. Email{" "}
        <a href="mailto:hasani@hendrixventures.com">
          hasani@hendrixventures.com
        </a>{" "}
        for current deals.
      </p>
    );
  }

  if (!deals) {
    return (
      <div className="inv-results">
        <Skeleton />
      </div>
    );
  }

  return (
    <div className="inv-results">
      <h2 className="sr-only">Deals</h2>
      <div className="inv-toolbar">
        <p className="inv-count" aria-live="polite">
          {shown.length} {shown.length === 1 ? "deal" : "deals"}
        </p>
        <div className="inv-filter">
          <label htmlFor="inv-status">Filter by status</label>
          <select
            id="inv-status"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="inv-note">No deals match that status right now.</p>
      ) : (
        <ul className="inv-grid" role="list">
          {shown.flatMap((deal, i) => {
            const details = formatDetails(deal);
            const card = (
              <li key={deal._id} className="inv-card">
                <div className="inv-media">
                  {deal.image ? (
                    <img
                      src={`${deal.image}?w=640&fit=max&auto=format`}
                      alt={`Property at ${deal.address}`}
                      width={640}
                      height={427}
                      loading="lazy"
                    />
                  ) : (
                    <div className="inv-noimage" aria-hidden="true" />
                  )}
                  <span
                    className={`inv-status inv-status-${statusSlug(deal.status)}`}
                  >
                    {deal.status || "—"}
                  </span>
                </div>
                <div className="inv-card-body">
                  <p className="inv-price">{formatPrice(deal.price)}</p>
                  <p className="inv-address">{deal.address}</p>
                  {details.length > 0 && (
                    <p className="inv-details">
                      {details.map((part, j) => (
                        <React.Fragment key={part}>
                          {j > 0 && (
                            <>
                              {" "}
                              <span className="inv-sep" aria-hidden="true">
                                ·
                              </span>{" "}
                            </>
                          )}
                          {part}
                        </React.Fragment>
                      ))}
                    </p>
                  )}
                  {deal.mediaLink && (
                    <p className="inv-card-foot">
                      <a
                        href={deal.mediaLink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Photos &amp; media
                        <span className="sr-only">
                          {" "}
                          for {deal.address} (opens in a new tab)
                        </span>
                        <span className="inv-ext" aria-hidden="true">
                          ↗
                        </span>
                      </a>
                    </p>
                  )}
                </div>
              </li>
            );
            // The "first look" card sits inside the grid, at the moment a
            // buyer is actively scanning inventory — same chrome as the
            // deals, no popup, no interruption.
            const joinIndex = Math.min(2, shown.length - 1);
            if (i === joinIndex) {
              return [
                card,
                <li key="join-card" className="inv-card inv-join-card">
                  <div className="inv-join-body">
                    <p className="inv-join-kicker">First look</p>
                    <h3>New deals go to the buyer list first</h3>
                    <p className="inv-join-copy">
                      Serious buyers on our list hear about new inventory
                      first. Tell us what you buy and we'll bring the right
                      deals straight to you.
                    </p>
                    <a href="#buyer-list" className="btn btn-primary">
                      Join the buyer list
                    </a>
                  </div>
                </li>,
              ];
            }
            return [card];
          })}
        </ul>
      )}
    </div>
  );
}
