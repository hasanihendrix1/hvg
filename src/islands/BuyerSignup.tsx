import React, { useId, useState } from "react";
import "../styles/investor.css";
import {
  BUYER_CONSENT_TEXT,
  BUYER_DEAL_ALERTS_CONSENT_TEXT,
  BUYER_DEAL_UPDATES_CONSENT_TEXT,
  BUYER_LINE,
} from "../data/consent";

// Area code and exchange never start with 0 or 1, so a typo here is caught
// on the form rather than reaching dotato as an undialable number.
const PHONE_REGEX =
  /^(?:\+?1[-. ]?)?\(?([2-9][0-9]{2})\)?[-. ]?([2-9][0-9]{2})[-. ]?([0-9]{4})$/;

type Status = "idle" | "submitting" | "success" | "error";

export default function BuyerSignup() {
  const uid = useId();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [buyerType, setBuyerType] = useState("");
  const [consent, setConsent] = useState(false);
  const [dealAlerts, setDealAlerts] = useState(false);
  const [dealUpdates, setDealUpdates] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [fieldError, setFieldError] = useState("");
  const formRef = React.useRef<HTMLFormElement>(null);

  // Typed or autofilled before hydration, a value is on screen but not in
  // state, and the first re-render would wipe it; adopt it instead.
  React.useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const adopt = (suffix: string, set: (v: string) => void) => {
      const v = (document.getElementById(`${uid}-${suffix}`) as HTMLInputElement | null)?.value;
      if (v) set(v);
    };
    adopt("first", setFirstName);
    adopt("last", setLastName);
    adopt("phone", setPhone);
    adopt("email", setEmail);
    const picked = form.querySelector<HTMLInputElement>('input[type="radio"]:checked');
    if (picked) setBuyerType(picked.value);
    const ticked = (name: string) =>
      form.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.checked;
    if (ticked("consentCallsEmail")) setConsent(true);
    if (ticked("consentDealAlerts")) setDealAlerts(true);
    if (ticked("consentDealUpdates")) setDealUpdates(true);
  }, [uid]);

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
    if (!consent) {
      setFieldError("Please check the box to agree to calls and emails.");
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
          consentDealAlerts: dealAlerts,
          consentDealUpdates: dealUpdates,
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
        <h2>You're on the list</h2>
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
    <form ref={formRef} className="buyer-form" onSubmit={handleSubmit} noValidate>
      <h2>Get first look at new deals</h2>
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
        <div className="buyer-type-options">
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
        </div>
      </fieldset>
      <label className="buyer-consent">
        <input
          type="checkbox"
          name="consentCallsEmail"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          required
        />
        <span>
          {BUYER_CONSENT_TEXT} See our{" "}
          <a href="/investor-privacy">Investor Privacy Notice</a>.
        </span>
      </label>
      {/* ⚖ The investor deal-texts opt-ins (A2P 10DLC), one box per kind of
          text (consent.ts says why): each optional, unchecked until the buyer
          ticks it, and never needed to join. Their links go to the investor
          pages only; the homeowner campaign keeps its own. */}
      <label className="buyer-consent">
        <input
          type="checkbox"
          name="consentDealAlerts"
          checked={dealAlerts}
          onChange={(e) => setDealAlerts(e.target.checked)}
        />
        <span>{BUYER_DEAL_ALERTS_CONSENT_TEXT}</span>
      </label>
      <label className="buyer-consent buyer-consent-texts">
        <input
          type="checkbox"
          name="consentDealUpdates"
          checked={dealUpdates}
          onChange={(e) => setDealUpdates(e.target.checked)}
        />
        <span>{BUYER_DEAL_UPDATES_CONSENT_TEXT}</span>
      </label>
      <p className="buyer-consent-links">
        {BUYER_LINE && (
          <>
            Or text DEALS to{" "}
            <a href={BUYER_LINE.sms} className="buyer-line">
              {BUYER_LINE.display}
            </a>
            .{" "}
          </>
        )}
        See our <a href="/investor-sms-terms">Investor SMS Terms</a> and{" "}
        <a href="/investor-text-consent">how investors agree to texts</a>.
      </p>
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
