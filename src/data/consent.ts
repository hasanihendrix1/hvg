// ⚖ The seller form's one SMS consent box. Shown verbatim by OfferForm.tsx
// and /text-consent; netlify/functions/submit-lead.js stores its own copy
// (tests/consent-sync.test.mjs fails if they differ). Bump the version on any
// wording change. Homeowners get no marketing texts (their own A2P 10DLC
// campaign); investor deal texts are a separate campaign with the boxes below.
export const CONSENT_VERSION = "2026-10-05.1";
export const CONSENT_TEXT =
  "I agree to receive text messages from Hendrix Ventures Group LLC about selling my property, at the number provided. Msg frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help. Consent is not required to get an offer.";

// ⚖ The buyer form's required box (BuyerSignup.tsx). Calls and emails only;
// netlify/functions/newBuyer.js sends its own copy to dotato as evidence
// (tests/consent-sync.test.mjs fails if they differ).
export const BUYER_CONSENT_TEXT =
  "I agree to receive calls and emails from Hendrix Ventures Group LLC about investment inventory.";

// ⚖ The buyer form's two optional texting boxes, the investor deal-texts
// campaign (dotato docs/a2p-buyer-campaign-draft.md quotes them in the
// message flow). Two boxes because Twilio rejects one that covers marketing
// and informational texts together (error 30913). Shown by BuyerSignup.tsx
// and /investor-text-consent; newBuyer.js stores its own copies
// (tests/consent-sync.test.mjs fails if they differ). Bump a box's version on
// any change to its wording, and re-shoot the /investor-text-consent
// screenshot.

// Deal alerts: the marketing texts.
export const BUYER_DEAL_ALERTS_CONSENT_VERSION = "2026-11-11.1";
export const BUYER_DEAL_ALERTS_CONSENT_TEXT =
  "I agree to receive recurring promotional text messages from Hendrix Ventures Group LLC with deal alerts about investment properties we have available, at the number provided. Msg frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help. Deal alerts are optional and not required to join the buyer list.";

// Deal updates: the informational texts.
export const BUYER_DEAL_UPDATES_CONSENT_VERSION = "2026-11-11.1";
export const BUYER_DEAL_UPDATES_CONSENT_TEXT =
  "I agree to receive text messages from Hendrix Ventures Group LLC with updates on deals I respond to, such as walkthrough times and offer status, at the number provided. Msg frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help. Deal updates are optional and not required to join the buyer list.";

// ⚖ The buyer line, in E.164. Bought 2026-11-11 and on the "Buyers" Messaging
// Service, whose Advanced Opt-Out answers DEALS with the confirmation text once
// the investor campaign is approved (an unregistered number sends nothing).
// While empty the site never mentions texting DEALS. Changing it changes
// /investors, so re-shoot the /investor-text-consent screenshot then too.
export const BUYER_LINE_E164 = "+14702561938";

// ⚖ Whether we invite investors to text DEALS at the end of our calls, in our
// voicemails and in one-to-one emails. Off until each is true: buyer calls go
// out from the buyer line (so "this number" is the one on their screen) and the
// email carries the exact tap-to-text line on /investor-text-consent (owner,
// 2026-11-11: publish the keyword alone first).
export const BUYER_LINE_INVITES = false;

export function buyerLine(e164: string) {
  if (!e164) return null;
  return {
    display: `(${e164.slice(2, 5)}) ${e164.slice(5, 8)}-${e164.slice(8)}`,
    // `?&body=` is the form both iOS and Android prefill from.
    sms: `sms:${e164}?&body=DEALS`,
  };
}

export const BUYER_LINE = buyerLine(BUYER_LINE_E164);
