import React, { useState, useEffect } from "react";
import "../../styles/components/sellers/SellerForm.css";
import headshot from "../../assets/logos/PNG-02.png";

const SellerForm = () => {
  // State to record the time the form was rendered
  const [startTime, setStartTime] = useState(Date.now());

  useEffect(() => {
    setStartTime(Date.now());
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    fetch("/.netlify/functions/submitSellerForm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .then((response) => {
        console.log(response);
      })
      .catch((error) => {
        console.error("Error submitting form:", error);
      });
  };

  return (
    <section className="seller-form">
      <div className="form-header">
        <img src={headshot} alt="Hasani Hendrix" className="headshot" />
      </div>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Full Name</label>
          <input type="text" id="name" name="name" required />
        </div>
        <div className="form-group">
          <label htmlFor="phone">Phone</label>
          <input type="tel" id="phone" name="phone" required />
        </div>
        <div className="form-group">
          <label htmlFor="address">Property Address</label>
          <input type="text" id="address" name="address" required />
        </div>

        {/* Honeypot Field */}
        <div className="form-group honeypot" style={{ display: "none" }}>
          <label htmlFor="website">Website</label>
          <input type="text" id="website" name="website" autoComplete="off" />
        </div>

        {/* Hidden timestamp field */}
        <input type="hidden" name="timestamp" value={startTime} />

        <button type="submit" className="cta-button">
          Get My Offer Now!
        </button>
      </form>
      <p className="disclaimer">
        By submitting this form, you agree to receive text, email, and phone
        communications from us.
      </p>
    </section>
  );
};

export default SellerForm;
