import React, { useId, useState } from "react";
import "../styles/investor.css";

// ⚖ Consent line mirrors the seller form's pattern (plan §12); the old
// buyer form collected phone + email with no consent language at all.

const PHONE_REGEX =
  /^(?:\+?1[-. ]?)?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;

type Status = "idle" | "submitting" | "success" | "error";

export default function BuyerSignup() {
  const uid = useId();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [buyerType, setBuyerType] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [fieldError, setFieldError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "submitting") return;
    if (!firstName.trim() || !lastName.trim() || !buyerType) {
      setFieldError("Please fill in your name and buyer type.");
      return;
    }
    if (!PHONE_REGEX.test(phone.trim())) {
      setFieldError("Please enter a valid phone number.");
      return;
    }
    if (!/.+@.+\..+/.test(email.trim())) {
      setFieldError("Please enter a valid email address.");
      return;
    }
    setFieldError("");
    setStatus("submitting");
    try {
      const res = await fetch("/.netlify/functions/newBuyer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          number: phone.trim(),
          market: "atlanta",
          buyerType,
          consentMarketing: consent,
          investorLiftScore: 0,
          level: "Potential Buyer",
        }),
      });
      if (!res.ok) throw new Error(`newBuyer ${res.status}`);
      setStatus("success");
    } catch (err) {
      console.error("Buyer signup failed:", err);
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="buyer-form buyer-success" role="status">
        <h3>You're on the list</h3>
        <p>
          You'll hear from us when new inventory fits what you buy. Questions
          in the meantime:{" "}
          <a href="mailto:hasani@hendrixventures.com">
            hasani@hendrixventures.com
          </a>
        </p>
      </div>
    );
  }

  return (
    <form className="buyer-form" onSubmit={handleSubmit} noValidate>
      <h3>Get first look at new deals</h3>
      <div className="buyer-row">
        <div className="form-group">
          <label htmlFor={`${uid}-first`}>First name</label>
          <input
            id={`${uid}-first`}
            type="text"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor={`${uid}-last`}>Last name</label>
          <input
            id={`${uid}-last`}
            type="text"
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="buyer-row">
        <div className="form-group">
          <label htmlFor={`${uid}-phone`}>Mobile phone</label>
          <input
            id={`${uid}-phone`}
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor={`${uid}-email`}>Email</label>
          <input
            id={`${uid}-email`}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
      </div>
      <fieldset className="buyer-types">
        <legend>What do you buy?</legend>
        {["Landlord", "Fix and Flipper", "Both"].map((t) => (
          <label key={t} className="buyer-type-option">
            <input
              type="radio"
              name={`${uid}-buyerType`}
              value={t}
              checked={buyerType === t}
              onChange={() => setBuyerType(t)}
            />
            <span>{t}</span>
          </label>
        ))}
      </fieldset>
      <label className="buyer-consent">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>
          I agree to receive calls, texts, and emails from Hendrix Ventures
          Group LLC about investment inventory. Msg frequency varies. Msg
          &amp; data rates may apply. Reply STOP to opt out. See our{" "}
          <a href="/privacy">Privacy Policy</a> and{" "}
          <a href="/sms-terms">SMS Terms</a>.
        </span>
      </label>
      <button
        type="submit"
        className="btn btn-primary"
        disabled={status === "submitting"}
      >
        {status === "submitting" ? "Sending…" : "Join the buyer list"}
      </button>
      <div aria-live="polite">
        {fieldError && (
          <p className="buyer-error" role="alert">
            {fieldError}
          </p>
        )}
        {status === "error" && (
          <p className="buyer-error" role="alert">
            Something went wrong. Email{" "}
            <a href="mailto:hasani@hendrixventures.com">
              hasani@hendrixventures.com
            </a>{" "}
            and we'll add you directly.
          </p>
        )}
      </div>
    </form>
  );
}
