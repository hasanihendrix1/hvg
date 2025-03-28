import React, { useState, useEffect } from "react";
import "../../styles/components/sellers/SellerForm.css";
import headshot from "../../assets/logos/PNG-02.png";

const SellerForm = () => {
  // Record the time the form was rendered
  const [startTime, setStartTime] = useState(Date.now());
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setStartTime(Date.now());
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    let data = Object.fromEntries(formData.entries());
    // Format the timestamp into a readable string
    data.timestamp = new Date(Number(data.timestamp)).toLocaleString();

    // Phone number validation using a regex for typical 10-digit numbers
    const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
    if (!phoneRegex.test(data.phone)) {
      setErrorMessage(
        "Please enter a valid phone number (e.g., 123-456-7890)."
      );
      setSuccessMessage("");
      return;
    }

    setLoading(true);

    fetch("/.netlify/functions/sendLead", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .then((response) => {
.then((response) => {
  setSuccessMessage("Your offer request was sent successfully!");
});
        setSuccessMessage("Your offer request was sent successfully!");
        setErrorMessage("");
        e.target.reset();
        setStartTime(Date.now());
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error submitting form:", error);
        setErrorMessage(
          "There was an error submitting your request. Please try again."
        );
        setSuccessMessage("");
        setLoading(false);
      });
  };

  return (
    <section className="seller-form">
      <div className="form-header">
        <img src={headshot} alt="Hasani Hendrix" className="headshot" />
        {/* Title and description */}
        <div className="form-title">
          <h2>Get Your Cash Offer Today</h2>
          <p>
            Fill out the form below for a free, no-obligation cash offer on your
            home.
          </p>
        </div>
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
          {loading ? "Submitting..." : "Get My Offer Now!"}
        </button>
      </form>
      {loading && <div className="loading-spinner"></div>}
      {successMessage && <p className="success-message">{successMessage}</p>}
      {errorMessage && <p className="error-message">{errorMessage}</p>}
      <p className="disclaimer">
        By submitting this form, you agree to receive text, email, and phone
        communications from us.
      </p>
    </section>
  );
};

export default SellerForm;
