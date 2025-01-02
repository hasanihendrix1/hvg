import React from "react";
import { Link } from "react-router-dom";
import "../../styles/components/common/NavBar.css";
import logo from "../../assets/logos/HVentures-Logo1.png";

const BuyersNav = () => {
  const navLinks = [
    { path: "/how-it-works", label: "How It Works" },
    { path: "/our-company", label: "Our Company" },
    { path: "/faq", label: "FAQ" },
    { path: "/resources", label: "Resources" },
  ];
  return (
    <header>
      <div className="top-bar">
        <div className="navbar-left">
          <img src={logo} alt="Company Logo" className="company-logo" />
          <p>Hendrix Ventures Group, LLC</p>
        </div>
        <div className="navbar-middle">
          <ul className="nav-links">
            {navLinks.map((link) => (
              <li key={link.path}>
                <Link to={link.path}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="navbar-right">
          <p>Call Us: (123) 456-7890</p>
          <button className="cta-button-top">Join Our Buyer’s List</button>
        </div>
      </div>
    </header>
  );
};

export default BuyersNav;
