import React, { useState } from "react";
import BuyerForm from "../components/buyers/BuyerForm";
import DealInventory from "../components/buyers/DealInventory";
import InventoryFilterBar from "../components/buyers/InventoryFilterBar";
import "../styles/pages/BuyersPage.css";

const BuyersPage = () => {
  const [filterStatus, setFilterStatus] = useState("");

  return (
    <div className="buyers-page">
      <section className="hero-and-deals-container">
        <div className="hero-container">
          <div className="hero-text">
            <h1>Exclusive Investment Opportunities</h1>
            <p>
              Join our network of serious investors and gain priority access to
              off-market properties today!
            </p>
            <p className="hero-phone-number">
              <strong>Questions? </strong>
              <a href="tel:+16787105786">(678) 710-5786</a>
            </p>
          </div>
        </div>
        <InventoryFilterBar onFilterChange={setFilterStatus} />
        <div className="deal-inventory-section">
          <DealInventory filterStatus={filterStatus} />
          <div className="buyer-form-wrapper">
            <BuyerForm />
          </div>
        </div>
      </section>
    </div>
  );
};

export default BuyersPage;
