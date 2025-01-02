import React from "react";
import "../styles/pages/BuyersPage.css";

const BuyersPage = () => {
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form submitted!");
    // Add API call or serverless function here
  };

  return (
    <div className="buyers-page">
      {/* Hero Section */}
      <section className="hero-container">
        <div className="hero-text">
          <h1>Metro-Atlanta Investment Properties Under $100k</h1>
          <p>
            Gain exclusive access to deeply discounted off-market properties.
          </p>
          <p>Join our list of serious investors today!</p>
        </div>
        <div className="hero-form">
          <h2>Enter Your Information Below to Get Access Now</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Name*</label>
              <input
                type="text"
                id="name"
                placeholder="Enter your name"
                required
              />
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

            <button type="submit" className="form-submit">
              Show Me The Deals!
            </button>
          </form>
        </div>
      </section>

      {/* Information Section */}
      <section className="info-section">
        <h2>Why Join Our Buyer's List?</h2>
        <p>
          We specialize in finding investment properties at unbeatable prices.
          Our buyers get first access to off-market deals, many under $100k.
        </p>
        <ul className="info-list">
          <li>Access to exclusive deals not on the MLS</li>
          <li>Real-time email notifications</li>
          <li>Detailed property information and photos</li>
        </ul>
      </section>
    </div>
  );
};

export default BuyersPage;
