import React from "react";
import { Link } from "react-router-dom";
import "../../styles/components/common/Footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      <nav className="footer-nav">
        <Link to="/cash-offer">Get A Cash Offer Today</Link>
        <Link to="/faq">FAQ</Link>
        <Link to="/resources">Resources</Link>
        <Link to="/privacy-policy">Privacy Policy</Link>
        <Link to="/terms-conditions">Terms & Conditions</Link>
        <Link to="/compare">Compare</Link>
      </nav>

      <div className="footer-description">
        <p>
          We are a real estate solutions firm, helping homeowners
          overcome property challenges quickly and effortlessly. Specializing in
          fair, all-cash offers, we streamline every deal for a stress-free
          experience. We pride ourselves on being
          the cream of the crop, uplifting communities one transaction at a
          time.
        </p>
      </div>

      <div className="footer-copyright">
        <p>
          © {new Date().getFullYear()} Hendrix Ventures Group, LLC. All rights
          reserved.
        </p>
        <p>- Powered by coffee and passion</p>
      </div>
    </footer>
  );
};

export default Footer;
