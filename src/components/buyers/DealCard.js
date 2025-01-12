import React from "react";
import "../../styles/components/buyers/DealCard.css";

const DealCard = ({ deal }) => {
  return (
    <div className="deal-card">
      <img src={deal.image} alt={deal.title} className="deal-card-image" />
      <div className="deal-card-info">
        <p className="deal-card-price">{deal.price}</p>
        <p className="deal-card-details">
          {deal.bedrooms} bd • {deal.bathrooms} ba • {deal.sqft} sqft
        </p>
        <p className="deal-card-address">{deal.address}</p>
        <p className={`deal-card-status ${deal.status.toLowerCase()}`}>
          {deal.status}
        </p>
      </div>
    </div>
  );
};

export default DealCard;
