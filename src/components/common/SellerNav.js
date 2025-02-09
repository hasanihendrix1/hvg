import React from "react";
import BaseNav from "./BaseNav";

const SellerNav = () => {
  // Create extra items as simple anchor links.
  const extraItems = [
    <a href="#how-it-works" className="nav-link">
      How It Works
    </a>,
    <a href="#testimonials" className="nav-link">
      Testimonials
    </a>,
    <a href="#get-offer" className="nav-link">
      Get Your Offer Now!
    </a>,
  ];

  return <BaseNav extraItems={extraItems} />;
};

export default SellerNav;
