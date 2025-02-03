import React from "react";
import "../../styles/components/sellers/SellerForm.css";

const SellerForm = () => {
  return (
    <section className="seller-form">
      <form>
        <div className="form-group">
          <label htmlFor="name">Name</label>
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
        <div className="form-group captcha">
          <label>CAPTCHA</label>
          {/* Replace this with an actual CAPTCHA integration */}
          <div className="captcha-placeholder">[CAPTCHA Placeholder]</div>
        </div>
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
