import React from "react";
import "../../../styles/components/sellers/sections/OverviewSection.css";
import headshot from "../../../assets/logos/Headshot1.jpg";

const OverviewSection = () => {
  return (
    <section className="overview">
      <h2>Why Choose Us?</h2>
      <div className="overview-content">
        <div className="point">
          <h3>Fast & Simple Process</h3>
          <p>
            We offer a streamlined, stress-free solution to selling your house
            in any condition.
          </p>
        </div>
        <div className="point">
          <h3>Fair Cash Offers</h3>
          <p>
            Skip the agent commissions and repairs. We provide fair,
            no-obligation offers.
          </p>
        </div>
        <div className="overview-image">
          <img src={headshot} alt="Company Logo or Headshot" />
        </div>
      </div>
    </section>
  );
};

export default OverviewSection;
