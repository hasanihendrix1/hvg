import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import "../styles/offer-form.css";

// ⚖ Consent language — keep in sync with netlify/functions/submit-lead.js
// (CONSENT_VERSION "2026-08-12.1"). Flagged for attorney review pre-launch.
const CONSENT_TRANSACTIONAL =
  "I agree to receive calls and text messages from Hendrix Ventures Group LLC about my request at the number provided. Msg frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help.";
const CONSENT_MARKETING =
  "I'd also like occasional updates about buying or selling property. I agree to receive recurring marketing calls and text messages (including via automated technology) from Hendrix Ventures Group LLC at the number provided. Consent is not a condition of receiving an offer or of any purchase.";

const PHONE_REGEX =
  /^(?:\+?1[-. ]?)?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;

const TIMELINES = [
  "As soon as possible",
  "Within 30 days",
  "1–3 months",
  "3+ months",
  "Just exploring",
];

type Status = "idle" | "submitting" | "success" | "error";

const track = (event: string, meta?: Record<string, unknown>) => {
  try {
    void fetch("/.netlify/functions/track-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, path: window.location.pathname, meta }),
      keepalive: true,
    });
  } catch {
    /* analytics must never break the form */
  }
};

const collectUtm = (): Record<string, string> | null => {
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
  ]) {
    const v = params.get(key);
    if (v) utm[key] = v.slice(0, 200);
  }
  return Object.keys(utm).length ? utm : null;
};

export default function OfferForm() {
  const uid = useId();
  const [step, setStep] = useState<1 | 2>(1);
  const [address, setAddress] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [timeline, setTimeline] = useState("");
  const [consentTransactional, setConsentTransactional] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [fax, setFax] = useState(""); // honeypot
  const [status, setStatus] = useState<Status>("idle");
  const [fieldError, setFieldError] = useState("");
  const startTime = useRef(Date.now());
  const startedTracked = useRef(false);
  const partialSent = useRef(false);
  const submissionId = useMemo(
    () =>
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    []
  );
  const step2Heading = useRef<HTMLHeadingElement>(null);

  // An address arriving via the homepage quick-start form pre-fills step 1
  useEffect(() => {
    const preset = new URLSearchParams(window.location.search).get("address");
    if (preset && preset.trim()) {
      setAddress(preset.trim());
    }
  }, []);

  const onFirstInteraction = () => {
    if (!startedTracked.current) {
      startedTracked.current = true;
      track("form_start");
    }
  };

  const sendPartial = (addr: string) => {
    if (partialSent.current) return;
    partialSent.current = true;
    // A workable lead even if step 2 is abandoned
    try {
      void fetch("/.netlify/functions/submit-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "partial",
          submissionId,
          address: addr,
          fax,
          pageUrl: window.location.href,
          utm: collectUtm(),
        }),
        keepalive: true,
      });
    } catch {
      /* partial capture is best-effort */
    }
  };

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) {
      setFieldError("Please enter the property address.");
      return;
    }
    setFieldError("");
    sendPartial(address.trim());
    track("step1_complete");
    setStep(2);
  };

  // Move focus to step 2 for keyboard/screen-reader users
  useEffect(() => {
    if (step === 2 && step2Heading.current) {
      step2Heading.current.focus();
    }
  }, [step]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "submitting") return;

    if (!name.trim()) {
      setFieldError("Please enter your name.");
      return;
    }
    if (!PHONE_REGEX.test(phone.trim())) {
      setFieldError("Please enter a valid phone number (e.g., (404) 555-0142).");
      return;
    }
    setFieldError("");
    setStatus("submitting");

    try {
      const res = await fetch("/.netlify/functions/submit-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "complete",
          submissionId,
          address: address.trim(),
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          timeline,
          consentTransactional,
          consentMarketing,
          fax,
          fillTimeMs: Date.now() - startTime.current,
          pageUrl: window.location.href,
          utm: collectUtm(),
        }),
      });
      if (!res.ok) {
        throw new Error(`submit-lead responded ${res.status}`);
      }
      track("step2_complete");
      setStatus("success");
    } catch (err) {
      console.error("Lead submission failed:", err);
      track("submit_error");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="offer-form offer-success" role="status">
        <h3>Got it — here's exactly what happens next</h3>
        <ol>
          <li>
            <strong>We call or text you</strong> to talk through the house —
            no scripts, no pressure. You'll be talking to Hasani.
          </li>
          <li>
            <strong>We look at the property</strong> — in person or over a
            quick video walkthrough, whichever you prefer.
          </li>
          <li>
            <strong>You get a written offer</strong>, usually within 24 hours
            of the walkthrough. Take your time with it — it never expires on
            our schedule, and no is a fine answer.
          </li>
        </ol>
        <p>
          Want to talk sooner?{" "}
          <a href="tel:+16787105786">Call or text (678) 710-5786</a>.
        </p>
      </div>
    );
  }

  return (
    <div className="offer-form">
      {step === 1 ? (
        <form onSubmit={handleStep1} noValidate>
          <div className="form-group">
            <label htmlFor={`${uid}-address`}>Property address</label>
            <input
              type="text"
              id={`${uid}-address`}
              name="address"
              autoComplete="street-address"
              placeholder="123 Main St NW, Atlanta, GA"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onFocus={onFirstInteraction}
              required
            />
          </div>
          <HoneypotField uid={uid} value={fax} onChange={setFax} />
          <button type="submit" className="btn btn-primary offer-submit">
            Get my cash offer
          </button>
          <p className="offer-microcopy">
            Takes about 2 minutes · No obligation · Your info stays private
          </p>
          {fieldError && (
            <p className="offer-error" role="alert">
              {fieldError}
            </p>
          )}
        </form>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <h3 tabIndex={-1} ref={step2Heading} className="offer-step2-heading">
            Almost done — where should we send your offer?
          </h3>
          <p className="offer-address-echo">
            {address} ·{" "}
            <button
              type="button"
              className="offer-edit-address"
              onClick={() => setStep(1)}
            >
              edit
            </button>
          </p>
          <div className="form-group">
            <label htmlFor={`${uid}-name`}>Your name</label>
            <input
              type="text"
              id={`${uid}-name`}
              name="name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor={`${uid}-phone`}>Mobile phone</label>
            <input
              type="tel"
              id={`${uid}-phone`}
              name="phone"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-describedby={`${uid}-phone-why`}
              required
            />
            <p className="offer-field-note" id={`${uid}-phone-why`}>
              We only use this to reach you about your offer — never marketing
              lists.
            </p>
          </div>
          <div className="form-group">
            <label htmlFor={`${uid}-email`}>
              Email <span className="offer-optional">(optional)</span>
            </label>
            <input
              type="email"
              id={`${uid}-email`}
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor={`${uid}-timeline`}>
              When do you need to sell?{" "}
              <span className="offer-optional">(optional)</span>
            </label>
            <select
              id={`${uid}-timeline`}
              name="timeline"
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
            >
              <option value="">Choose one…</option>
              {TIMELINES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="offer-consent">
            <legend className="sr-only">Communication preferences</legend>
            <label className="offer-consent-row">
              <input
                type="checkbox"
                checked={consentTransactional}
                onChange={(e) => setConsentTransactional(e.target.checked)}
              />
              <span>{CONSENT_TRANSACTIONAL}</span>
            </label>
            <label className="offer-consent-row">
              <input
                type="checkbox"
                checked={consentMarketing}
                onChange={(e) => setConsentMarketing(e.target.checked)}
              />
              <span>
                <em>(Optional)</em> {CONSENT_MARKETING}
              </span>
            </label>
            <p className="offer-consent-links">
              Neither box is required to get your offer. See our{" "}
              <a href="/privacy">Privacy Policy</a> and{" "}
              <a href="/sms-terms">SMS &amp; Communications Terms</a>.
            </p>
          </fieldset>

          <HoneypotField uid={uid} value={fax} onChange={setFax} />

          <button
            type="submit"
            className="btn btn-primary offer-submit"
            disabled={status === "submitting"}
          >
            {status === "submitting"
              ? "Sending…"
              : "Get my cash offer — free, no obligation"}
          </button>

          <div aria-live="polite">
            {fieldError && (
              <p className="offer-error" role="alert">
                {fieldError}
              </p>
            )}
            {status === "error" && (
              <p className="offer-error" role="alert">
                Something went wrong sending your request. Please try again —
                or just <a href="tel:+16787105786">call or text us at (678)
                710-5786</a> and we'll take it from there.
              </p>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

function HoneypotField({
  uid,
  value,
  onChange,
}: {
  uid: string;
  value: string;
  onChange: (v: string) => void;
}) {
  // Named "fax" so password managers ignore it; bots fill everything
  return (
    <div className="offer-honeypot" style={{ display: "none" }} aria-hidden="true">
      <label htmlFor={`${uid}-fax`}>Fax</label>
      <input
        type="text"
        id={`${uid}-fax`}
        name="fax"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
