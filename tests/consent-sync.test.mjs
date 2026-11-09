import { test, expect } from "vitest";
import {
  CONSENT_TEXT as SERVER_TEXT,
  CONSENT_VERSION as SERVER_VERSION,
} from "../netlify/functions/submit-lead.js";
import { BUYER_CONSENT_TEXT as BUYER_SERVER_TEXT } from "../netlify/functions/newBuyer.js";
import {
  BUYER_CONSENT_TEXT,
  CONSENT_TEXT,
  CONSENT_VERSION,
} from "../src/data/consent.ts";

// The form and /text-consent show src/data/consent.ts; the function stores its
// own copy as evidence. A mismatch would record wording the seller never saw.
test("the seller form's consent wording matches what the server records", () => {
  expect(CONSENT_VERSION).toBe(SERVER_VERSION);
  expect(SERVER_TEXT).toEqual({ transactional: CONSENT_TEXT });
});

test("the one SMS box carries the required disclosures and no marketing", () => {
  expect(CONSENT_TEXT).toBe(
    "I agree to receive text messages from Hendrix Ventures Group LLC about selling my property, at the number provided. Msg frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help. Consent is not required to get an offer."
  );
  expect(CONSENT_TEXT.toLowerCase()).not.toContain("marketing");
});

// The buyer form's box: calls and emails only (no texts until an investor A2P
// campaign exists). The function sends its copy to dotato as the evidence.
test("the buyer form's consent wording matches what the server sends to dotato", () => {
  expect(BUYER_SERVER_TEXT).toBe(BUYER_CONSENT_TEXT);
  expect(BUYER_CONSENT_TEXT).toBe(
    "I agree to receive calls and emails from Hendrix Ventures Group LLC about investment inventory."
  );
  expect(BUYER_CONSENT_TEXT.toLowerCase()).not.toContain("text");
});
