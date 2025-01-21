import React, { useState } from "react";
import "../../styles/components/buyers/BuyerForm.css";

const BuyerForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    email: "",
    market: "",
    buyerType: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation (additional validation can be added)
    if (
      !formData.name ||
      !formData.contact ||
      !formData.email ||
      !formData.market ||
      !formData.buyerType
    ) {
      alert("Please fill in all required fields!");
      return;
    }

    try {
      const response = await fetch("YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.text();

      if (response.ok) {
        alert("Your information has been submitted successfully!");
        console.log("Response from server:", result);
        // Clear form after successful submission
        setFormData({
          name: "",
          contact: "",
          email: "",
          market: "",
          buyerType: "",
        });
      } else {
        alert(`Submission failed: ${result}`);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("An error occurred. Please try again later.");
    }
  };

  return (
    <div className="hero-form">
      <h2>Gain Priority Access to Discounted Deals!</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Name*</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter your name"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="contact">Contact Number*</label>
          <input
            type="text"
            id="contact"
            name="contact"
            value={formData.contact}
            onChange={handleChange}
            placeholder="Enter your contact number"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email*</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your email"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="market">Market*</label>
          <select
            id="market"
            name="market"
            value={formData.market}
            onChange={handleChange}
            required
          >
            <option value="">Select a market</option>
            <option value="atlanta">Atlanta</option>
            {/* Add other markets as needed */}
          </select>
        </div>
        <div className="form-group">
          <label>What type of buyer are you?*</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="buyerType"
                value="Landlord"
                checked={formData.buyerType === "Landlord"}
                onChange={handleChange}
                required
              />
              Landlord
            </label>
            <label>
              <input
                type="radio"
                name="buyerType"
                value="Fix and Flipper"
                checked={formData.buyerType === "Fix and Flipper"}
                onChange={handleChange}
              />
              Fix and Flipper
            </label>
            <label>
              <input
                type="radio"
                name="buyerType"
                value="Both"
                checked={formData.buyerType === "Both"}
                onChange={handleChange}
              />
              Both
            </label>
          </div>
        </div>
        <button type="submit" className="form-submit">
          Send Me Deals!
        </button>
      </form>
    </div>
  );
};

export default BuyerForm;
