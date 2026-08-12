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
    return <p className="inv-note">Loading inventory…</p>;
  }

  return (
    <div>
      <div className="inv-toolbar">
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

      {shown.length === 0 ? (
        <p className="inv-note">No deals match that status right now.</p>
      ) : (
        <ul className="inv-grid" role="list">
          {shown.map((deal) => (
            <li key={deal._id} className="inv-card">
              {deal.image ? (
                <img
                  src={`${deal.image}?w=640&fit=max&auto=format`}
                  alt={`Property at ${deal.address}`}
                  width={640}
                  height={360}
                  loading="lazy"
                />
              ) : (
                <div className="inv-noimage" aria-hidden="true" />
              )}
              <div className="inv-card-body">
                <p className="inv-price">{formatPrice(deal.price)}</p>
                <p className="inv-details">
                  {deal.bedrooms} bd · {deal.bathrooms} ba ·{" "}
                  {Number(deal.sqft).toLocaleString()} sqft
                </p>
                <p className="inv-address">{deal.address}</p>
                <p className="inv-meta">
                  <span
                    className={`inv-status inv-status-${(deal.status || "").toLowerCase()}`}
                  >
                    {deal.status || "—"}
                  </span>
                  {deal.mediaLink && (
                    <a
                      href={deal.mediaLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Photos &amp; media
                    </a>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
