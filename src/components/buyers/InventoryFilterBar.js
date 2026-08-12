import React from "react";
import Logo from "../../assets/logos/HVentures-Logo2.png";
import "../../styles/components/buyers/InventoryFilterBar.css";

const InventoryFilterBar = ({ onFilterChange }) => {
  return (
    <div className="inventory-filter-bar">
      <div className="logo-and-title">
        <img src={Logo} alt="Hendrix Ventures Logo" />
      </div>
      <p className="center-title">Inventory</p> {/* Centered Title */}
      <select
        className="filter-dropdown"
        aria-label="Filter deals by status"
        onChange={(e) => onFilterChange(e.target.value)}
      >
        <option value="">All Statuses</option>
        <option value="Available">Available</option>
        <option value="Assigned">Assigned</option>
        <option value="Sold">Sold</option>
      </select>
    </div>
  );
};

export default InventoryFilterBar;
