import React from "react";
import { Link } from "react-router-dom";
import "../../styles/components/common/Footer.css";

const BuyerFooter = () => {
  return (
    <footer className="footer">
      <div className="footer-slogan">
        <p>
          <strong>Confident Connections. Successful Closings.</strong>
        </p>
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
