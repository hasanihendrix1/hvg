import React from "react";
import "../../styles/components/common/NavBar.css";
import logo from "../../assets/logos/HVentures-Logo1.png";

const BuyersNav = () => {
  //   const navLinks = [
  //     { path: "/how-it-works", label: "How It Works" },
  //     { path: "/our-company", label: "Our Company" },
  //     { path: "/faq", label: "FAQ" },
  //     { path: "/resources", label: "Resources" },
  //   ];
  return (
    <header>
      <div className="top-bar">
        <div className="navbar-left">
          <img src={logo} alt="Company Logo" className="company-logo" />
          <p>Hendrix Ventures Group, LLC</p>
        </div>
      </div>
    </header>
  );
};

export default BuyersNav;
