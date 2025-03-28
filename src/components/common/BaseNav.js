import React from "react";
import "../../styles/components/common/NavBar.css";
import logo from "../../assets/logos/HVentures-Logo1.png";

const BaseNav = ({ extraItems }) => {
  return (
    <header>
      <div className="top-bar">
        <div className="navbar-left">
          <img src={logo} alt="Company Logo" className="company-logo" />
          <p>Hendrix Ventures Group, LLC</p>
        </div>
        {extraItems && (
          <div className="navbar-right">
            {extraItems.map((item, index) => (
              <div key={index} className="nav-item">
                {item}
              </div>
            ))}
          </div>
        )}
      </div>
    </header>
  );
};

export default BaseNav;
