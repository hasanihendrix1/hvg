import React from "react";
import "../../styles/components/buyers/BuyerForm.css";

const BuyerForm = () => {
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form submitted!");
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
        <button type="submit" className="form-submit">
          Show Me The Deals!
        </button>
      </form>
    </div>
  );
};

export default BuyerForm;
