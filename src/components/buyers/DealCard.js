import React from "react";
import "../../styles/components/buyers/DealCard.css";
import { formatPrice } from "../../utils/common"; // Adjust the path as needed

const DealCard = ({ deal }) => {
  // Normalize the status to display "Under Contract" for "pending" or "under contract"
  const normalizedStatus =
    deal.status.toLowerCase() === "pending" ||
    deal.status.toLowerCase() === "under contract"
      ? "Under Contract"
      : deal.status;

  return (
    <div className="deal-card">
      <img src={deal.image} alt={deal.title} className="deal-card-image" />
      <div className="deal-card-info">
        <p className="deal-card-price">{formatPrice(deal.price)}</p>
        <p className="deal-card-details">
          {deal.bedrooms} bd • {deal.bathrooms} ba • {deal.sqft} sqft
        </p>
        <p className="deal-card-address">{deal.address}</p>
        <p className={`deal-card-status ${normalizedStatus.toLowerCase()}`}>
          {normalizedStatus}
        </p>
      </div>
    </div>
  );
};

export default DealCard;
