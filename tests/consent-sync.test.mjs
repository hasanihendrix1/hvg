import { test, expect } from "vitest";
import {
  CONSENT_TEXT as SERVER_TEXT,
  CONSENT_VERSION as SERVER_VERSION,
} from "../netlify/functions/submit-lead.js";
import {
  BUYER_CONSENT_TEXT as BUYER_SERVER_TEXT,
  BUYER_TEXT_CONSENT_TEXT as BUYER_TEXT_SERVER_TEXT,
  BUYER_TEXT_CONSENT_VERSION as BUYER_TEXT_SERVER_VERSION,
} from "../netlify/functions/newBuyer.js";
import {
  BUYER_CONSENT_TEXT,
  BUYER_LINE,
  BUYER_LINE_E164,
  BUYER_TEXT_CONSENT_TEXT,
  BUYER_TEXT_CONSENT_VERSION,
  CONSENT_TEXT,
  CONSENT_VERSION,
  buyerLine,
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

// The buyer form's required box: calls and emails only. Texts have their own
// optional box below. The function sends its copy to dotato as the evidence.
test("the buyer form's consent wording matches what the server sends to dotato", () => {
  expect(BUYER_SERVER_TEXT).toBe(BUYER_CONSENT_TEXT);
  expect(BUYER_CONSENT_TEXT).toBe(
    "I agree to receive calls and emails from Hendrix Ventures Group LLC about investment inventory."
  );
  expect(BUYER_CONSENT_TEXT.toLowerCase()).not.toContain("text");
});

// The optional texting box (investor deal-texts campaign). The A2P message
// flow quotes this wording, so the form, /investor-text-consent, the stored
// record and the registration must all say the same thing.
test("the buyer texting box's wording matches what the server records", () => {
  expect(BUYER_TEXT_SERVER_VERSION).toBe(BUYER_TEXT_CONSENT_VERSION);
  expect(BUYER_TEXT_SERVER_TEXT).toBe(BUYER_TEXT_CONSENT_TEXT);
});

test("the buyer texting box is the registered wording, with every disclosure", () => {
  expect(BUYER_TEXT_CONSENT_TEXT).toBe(
    "I agree to receive recurring text messages from Hendrix Ventures Group LLC with alerts about investment properties and updates on deals I respond to, at the number provided. Msg frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help. Texts are optional and not required to join the buyer list."
  );
  for (const disclosure of [
    "Hendrix Ventures Group LLC",
    "Msg frequency varies.",
    "Msg & data rates may apply.",
    "Reply STOP to opt out",
    "HELP for help",
    "not required to join the buyer list",
  ]) {
    expect(BUYER_TEXT_CONSENT_TEXT).toContain(disclosure);
  }
  expect(BUYER_TEXT_CONSENT_TEXT).not.toBe(CONSENT_TEXT);
});

// A mistyped number would send every DEALS text somewhere else.
test("the buyer line is either not set yet or a dialable US number", () => {
  if (BUYER_LINE_E164 === "") {
    expect(BUYER_LINE).toBeNull();
    return;
  }
  expect(BUYER_LINE_E164).toMatch(/^\+1[2-9][0-9]{2}[2-9][0-9]{6}$/);
  expect(BUYER_LINE).toEqual(buyerLine(BUYER_LINE_E164));
});

test("a buyer line renders as the draft writes it, with a DEALS tap-to-text link", () => {
  expect(buyerLine("+14705550123")).toEqual({
    display: "(470) 555-0123",
    sms: "sms:+14705550123?&body=DEALS",
  });
  expect(buyerLine("")).toBeNull();
});
