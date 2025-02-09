import React from "react";
import HeroSection from "../components/sellers/sections/HeroSection";
import OverviewSection from "../components/sellers/sections/OverviewSection";
import SellerForm from "../components/sellers/SellerForm";
import FeaturedTestimonial from "../components/sellers/sections/FeaturedTestimonial";
import SellingProcess from "../components/sellers/sections/SellingProcess";
import "../styles/pages/SellersPage.css";

const SellersPage = () => {
  return (
    <div className="sellers-page">
      <div className="container">
        <section className="hero-form-container">
          <HeroSection
            title="We Buy Houses, FAST!"
            subtitle={`Any Condition | Net Cash Offer\nNo Fees | No Commissions | No Closing Costs\nSkip the Hassle – Sell Direct, Get Paid Faster.\n\nThis is Hendrix Ventures Group, LLC Official Website`}
          />
          <SellerForm />
        </section>

        {/* Add an id so that clicking "How It Works" scrolls here */}
        <section id="how-it-works">
          <SellingProcess />
        </section>

        <OverviewSection />

        <div className="section-spacer"></div>

        {/* Wrap the testimonial section with an id for "Testimonials" */}
        <div id="testimonials">
          <FeaturedTestimonial
            backgroundColor="var(--secondary-color)"
            videoQuote="Very quick, very easy... we closed in 4 days. I spoke with you on Monday and here we are on Thursday."
          />
        </div>

        <div className="section-spacer"></div>

        {/* Final sign-up section */}
        <section id="get-offer" className="final-signup-section">
          <h2 className="final-signup-title">
            Ready to Get Your No-Obligation Cash Offer?
          </h2>
          <SellerForm />
          <div className="section-spacer"></div>
        </section>
      </div>
    </div>
  );
};

export default SellersPage;
