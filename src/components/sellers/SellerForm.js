import React, { useState, useEffect, useId } from "react";
import "../../styles/components/sellers/SellerForm.css";
import headshot from "../../assets/logos/PNG-02.png";

const SellerForm = () => {
  // Record the time the form was rendered
  const [startTime, setStartTime] = useState(Date.now());
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const uid = useId();

  useEffect(() => {
    setStartTime(Date.now());
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    // Fill time measured entirely on the client clock — immune to clock skew
    data.fillTimeMs = Date.now() - startTime;

    // Accepts 10-digit US numbers, with or without a +1/1 prefix
    const phoneRegex =
      /^(?:\+?1[-. ]?)?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
    if (!phoneRegex.test(data.phone.trim())) {
      setErrorMessage(
        "Please enter a valid phone number (e.g., (404) 555-0142)."
      );
      setSuccessMessage("");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/.netlify/functions/sendLead", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw new Error(`sendLead responded with status ${res.status}`);
      }
      setSuccessMessage("Your offer request was sent successfully!");
      setErrorMessage("");
      form.reset();
      setStartTime(Date.now());
    } catch (error) {
      console.error("Error submitting form:", error);
      setErrorMessage(
        "There was an error submitting your request. Please try again, or call or text us at (678) 710-5786."
      );
      setSuccessMessage("");
    } finally {
      setLoading(false);
    }
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
          <label htmlFor={`${uid}-name`}>Full Name</label>
          <input
            type="text"
            id={`${uid}-name`}
            name="name"
            autoComplete="name"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor={`${uid}-phone`}>Phone</label>
          <input
            type="tel"
            id={`${uid}-phone`}
            name="phone"
            autoComplete="tel"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor={`${uid}-address`}>Property Address</label>
          <input
            type="text"
            id={`${uid}-address`}
            name="address"
            autoComplete="street-address"
            required
          />
        </div>

        {/* Honeypot field — hidden from real users and assistive tech.
            Named "fax" so password managers won't autofill it (they target
            "website"/"url" fields), while bots still fill every input. */}
        <div
          className="form-group honeypot"
          style={{ display: "none" }}
          aria-hidden="true"
        >
          <label htmlFor={`${uid}-fax`}>Fax</label>
          <input
            type="text"
            id={`${uid}-fax`}
            name="fax"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <button type="submit" className="cta-button" disabled={loading}>
          {loading ? "Submitting..." : "Get My Offer Now!"}
        </button>
      </form>
      {loading && <div className="loading-spinner"></div>}
      <div aria-live="polite" role="status">
        {successMessage && <p className="success-message">{successMessage}</p>}
        {errorMessage && <p className="error-message">{errorMessage}</p>}
      </div>
      <p className="form-consent">
        By submitting this form, you agree to receive text, email, and phone
        communications from us. Message &amp; data rates may apply. See our{" "}
        <a
          href="https://hendrixventuresgroup.h.trustco.ai"
          target="_blank"
          rel="noopener noreferrer"
        >
          SMS Policy
        </a>
        ,{" "}
        <a
          href="https://hendrixventuresgroup.h.trustco.ai/#termsArea"
          target="_blank"
          rel="noopener noreferrer"
        >
          Terms &amp; Conditions
        </a>
        , and{" "}
        <a
          href="https://hendrixventuresgroup.h.trustco.ai/#privacyArea"
          target="_blank"
          rel="noopener noreferrer"
        >
          Privacy Policy
        </a>
        .
      </p>
    </section>
  );
};

export default SellerForm;
