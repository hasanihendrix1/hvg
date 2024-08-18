import React from "react";
import { Link } from "react-router-dom";
import "../../styles/components/common/NavBar.css";

const Navbar = () => {
  return (
    <header>
      <div className="top-bar">
        <div className="navbar-left">
          <p>Hendrix Ventures Group, LLC</p>
        </div>
        <div className="navbar-middle">
          <ul className="nav-links">
            <li>
              <Link to="/how-it-works">How It Works</Link>
            </li>
            <li>
              <Link to="/our-company">Our Company</Link>
            </li>
            <li>
              <Link to="/terms-conditions">Terms & Conditions</Link>
            </li>
            <li>
              <Link to="/privacy-policy">Privacy Policy</Link>
            </li>
          </ul>
        </div>
        <div className="navbar-right">
          <p>Call Us: (123) 456-7890</p>
          <button className="cta-button-top">Get Your Offer Now!</button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
