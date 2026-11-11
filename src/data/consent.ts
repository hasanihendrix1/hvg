// ⚖ The seller form's one SMS consent box. Shown verbatim by OfferForm.tsx
// and /text-consent; netlify/functions/submit-lead.js stores its own copy
// (tests/consent-sync.test.mjs fails if they differ). Bump the version on any
// wording change. Homeowners get no marketing texts (their own A2P 10DLC
// campaign); investor deal texts are a separate campaign with the box below.
export const CONSENT_VERSION = "2026-10-05.1";
export const CONSENT_TEXT =
  "I agree to receive text messages from Hendrix Ventures Group LLC about selling my property, at the number provided. Msg frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help. Consent is not required to get an offer.";

// ⚖ The buyer form's required box (BuyerSignup.tsx). Calls and emails only;
// netlify/functions/newBuyer.js sends its own copy to dotato as evidence
// (tests/consent-sync.test.mjs fails if they differ).
export const BUYER_CONSENT_TEXT =
  "I agree to receive calls and emails from Hendrix Ventures Group LLC about investment inventory.";

// ⚖ The buyer form's optional texting box: the investor deal-texts campaign
// (dotato docs/a2p-buyer-campaign-draft.md quotes it in the message flow).
// Shown by BuyerSignup.tsx and /investor-text-consent; newBuyer.js stores its
// own copy (tests/consent-sync.test.mjs fails if they differ). Bump the
// version on any wording change, and re-shoot the /investor-text-consent
// screenshot.
export const BUYER_TEXT_CONSENT_VERSION = "2026-11-10.1";
export const BUYER_TEXT_CONSENT_TEXT =
  "I agree to receive recurring text messages from Hendrix Ventures Group LLC with alerts about investment properties and updates on deals I respond to, at the number provided. Msg frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help. Texts are optional and not required to join the buyer list.";

// ⚖ The buyer line, in E.164 ("+14705550123"). Empty until the number is
// bought, answers DEALS with the confirmation text, and sits in the "Buyers"
// Messaging Service; while empty the site never mentions texting DEALS.
// Setting it changes /investors, so re-shoot the /investor-text-consent
// screenshot then too.
export const BUYER_LINE_E164 = "";

export function buyerLine(e164: string) {
  if (!e164) return null;
  return {
    display: `(${e164.slice(2, 5)}) ${e164.slice(5, 8)}-${e164.slice(8)}`,
    // `?&body=` is the form both iOS and Android prefill from.
    sms: `sms:${e164}?&body=DEALS`,
  };
}

export const BUYER_LINE = buyerLine(BUYER_LINE_E164);
