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

      <div className="footer-compliance-links">
        <p>
          <strong>Connect Via Text:</strong>{" "}
          <a
            href="https://hendrixventuresgroup.h.trustco.ai"
            target="_blank"
            rel="noopener noreferrer"
          >
            hendrixventuresgroup.h.trustco.ai
          </a>
        </p>
        <p>
          <strong>Messaging T&amp;Cs:</strong>{" "}
          <a
            href="https://hendrixventuresgroup.h.trustco.ai/#termsArea"
            target="_blank"
            rel="noopener noreferrer"
          >
            View Terms
          </a>
        </p>
        <p>
          <strong>Messaging Privacy Policy:</strong>{" "}
          <a
            href="https://hendrixventuresgroup.h.trustco.ai/#privacyArea"
            target="_blank"
            rel="noopener noreferrer"
          >
            View Privacy Policy
          </a>
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
