// ⚖ The seller form's one SMS consent box. Shown verbatim by OfferForm.tsx
// and /text-consent; netlify/functions/submit-lead.js stores its own copy
// (tests/consent-sync.test.mjs fails if they differ). Bump the version on any
// wording change. There is no marketing program (A2P 10DLC registration).
export const CONSENT_VERSION = "2026-10-05.1";
export const CONSENT_TEXT =
  "I agree to receive text messages from Hendrix Ventures Group LLC about selling my property, at the number provided. Msg frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help. Consent is not required to get an offer.";
