import { test, expect } from "vitest";
import {
  CONSENT_TEXT as SERVER_TEXT,
  CONSENT_VERSION as SERVER_VERSION,
} from "../netlify/functions/submit-lead.js";
import { CONSENT_TEXT, CONSENT_VERSION } from "../src/data/consent.ts";

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
