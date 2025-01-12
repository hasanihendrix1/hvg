import React from "react";
import BuyerForm from "../components/buyers/BuyerForm";
import DealInventory from "../components/buyers/DealInventory";
import "../styles/pages/BuyersPage.css";
import Logo from "../assets/logos/HVentures-Logo2.png";

const BuyersPage = () => {
  return (
    <div className="buyers-page">
      {/* Combined Section */}
      <section className="hero-and-deals-container">
        {/* Hero Section */}
        <div className="hero-container">
          <div className="hero-text">
            <h1>Exclusive Investment Opportunities</h1>
            <p>
              Discover off-market properties perfect for investors looking to
              grow their portfolio.
            </p>
            <p>
              Join our network of serious investors and gain priority access
              today!
            </p>
            <img src={Logo} alt="Hendrix Ventures Logo" className="hero-logo" />
            <p className="hero-phone-number">
              <strong>Call Us: </strong>
              <a href="tel:+1234567890">(123) 456-7890</a>
            </p>
          </div>
          <BuyerForm />
        </div>

        {/* Deals Inventory Section */}
        <div className="deal-inventory-section">
          <DealInventory />
        </div>
      </section>
    </div>
  );
};

export default BuyersPage;
