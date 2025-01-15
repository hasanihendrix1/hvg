import React, { useState } from "react";
import "../../styles/components/buyers/BuyerForm.css";

const BuyerForm = () => {
  const [buyerType, setBuyerType] = useState("");

  const handleBuyerTypeChange = (e) => {
    setBuyerType(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form submitted with data:");
    console.log("Buyer Type:", buyerType);
    // Add API or CMS logic here
  };

  return (
    <div className="hero-form">
      <h2>Gain Priority Access to Discounted Deals!</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Name*</label>
          <input type="text" id="name" placeholder="Enter your name" required />
        </div>
        <div className="form-group">
          <label htmlFor="contact">Contact Number*</label>
          <input
            type="text"
            id="contact"
            placeholder="Enter your contact number"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email*</label>
          <input
            type="email"
            id="email"
            placeholder="Enter your email"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="market">Market*</label>
          <select id="market" required>
            <option value="">Select a market</option>
            <option value="atlanta">Atlanta</option>
          </select>
        </div>
        <div className="form-group">
          <label>What type of buyer are you?*</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="buyerType"
                value="Landlord"
                checked={buyerType === "Landlord"}
                onChange={handleBuyerTypeChange}
                required
              />
              Landlord
            </label>
            <label>
              <input
                type="radio"
                name="buyerType"
                value="Fix and Flipper"
                checked={buyerType === "Fix and Flipper"}
                onChange={handleBuyerTypeChange}
              />
              Fix and Flipper
            </label>
            <label>
              <input
                type="radio"
                name="buyerType"
                value="Both"
                checked={buyerType === "Both"}
                onChange={handleBuyerTypeChange}
              />
              Both
            </label>
          </div>
        </div>
        <button type="submit" className="form-submit">
          Send Me Deals!
        </button>
      </form>
    </div>
  );
};

export default BuyerForm;
