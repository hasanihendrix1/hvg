import React from "react";
import "../../styles/components/common/Footer.css";
import Logo from "../../assets/logos/HVentures-Logo3.png";

const BuyerFooter = () => {
  return (
    <footer className="footer">
      <div className="footer-slogan">
        <strong>Confident Connections. Successful Closings.</strong>
        <img src={Logo} alt="Hendrix Ventures Logo" className="footer-logo" />
      </div>

      <div className="footer-description">
        <p>
          We are a trusted real estate solutions firm, helping communities
          thrive through fair, all-cash offers and streamlined processes for a
          seamless experience.
        </p>
      </div>

      <div className="footer-copyright">
        <p>
          © {new Date().getFullYear()} Hendrix Ventures Group, LLC. All rights
          reserved.
        </p>
      </div>
    </footer>
  );
};

export default BuyerFooter;
