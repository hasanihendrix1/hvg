import React, { useState } from "react";
import "../../styles/components/buyers/DealCard.css";
import { formatPrice } from "../../utils/common"; // Adjust the path as needed

const DealCard = ({ deal }) => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const rawStatus = (deal.status || "").toLowerCase().trim();
  const normalizedStatus =
    rawStatus === "pending" || rawStatus === "under contract"
      ? "Under Contract"
      : deal.status || "—";

  const handleCardClick = () => {
    setIsPopupOpen(true);
  };

  const handleClosePopup = () => {
    setIsPopupOpen(false);
  };

  return (
    <>
      <div className="deal-card" onClick={handleCardClick}>
        <img
          src={deal.image}
          alt={deal.address ? `Property at ${deal.address}` : "Property photo"}
          className="deal-card-image"
        />
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

      {isPopupOpen && (
        <div className="popup-overlay">
          <div className="popup-content">
            <h3>Property Details</h3>
            <p>
              <strong>Address:</strong> {deal.address}
            </p>
            <p>
              <strong>Photos/Video:</strong>{" "}
              <a
                href={deal.mediaLink} // Dynamically fetch the media link
                target="_blank"
                rel="noopener noreferrer"
                className="popup-link"
              >
                Link
              </a>
            </p>
            <p>
              Email{" "}
              <a
                href="mailto:hasani@hendrixventures.com"
                className="popup-link"
              >
                hasani@hendrixventures.com
              </a>{" "}
              to submit an offer.
            </p>
            <button className="popup-close" onClick={handleClosePopup}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default DealCard;
