import React from "react";
import HeroSection from "../components/sellers/HeroSection";
import OverviewSection from "../components/sellers/OverviewSection";
import SellerForm from "../components/sellers/SellerForm";
import "../styles/pages/SellersPage.css";
import WaveSVG from "../assets/images/hero-divider.svg";

const SellersPage = () => {
  return (
    <div className="sellers-page">
      {/* Hero and Form Sections Container */}
      <div className="hero-form-container">
        <img src={WaveSVG} alt="wave divider" className="wave-svg" />
        <HeroSection
          title="We Buy Houses in Atlanta, FAST!"
          subtitle={`Any Condition | Net Cash Offer\nNo Fees | No Commissions | No Closing Costs\nSkip the Hassle – Sell Direct, Get Paid Faster.\n\nThis is Hendrix Ventures Group, LLC Official Website`}
        />

        <SellerForm />
        {/* Spacer */}
        <div style={{ height: "50px" }}></div>
      </div>
      {/* Overview Section */}
      <OverviewSection />
    </div>
  );
};

export default SellersPage;
