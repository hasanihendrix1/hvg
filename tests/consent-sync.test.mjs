import { test, expect } from "vitest";
import {
  CONSENT_TEXT as SERVER_TEXT,
  CONSENT_VERSION as SERVER_VERSION,
} from "../netlify/functions/submit-lead.js";
import {
  BUYER_CONSENT_TEXT as BUYER_SERVER_TEXT,
  BUYER_DEAL_ALERTS_CONSENT_TEXT as ALERTS_SERVER_TEXT,
  BUYER_DEAL_ALERTS_CONSENT_VERSION as ALERTS_SERVER_VERSION,
  BUYER_DEAL_UPDATES_CONSENT_TEXT as UPDATES_SERVER_TEXT,
  BUYER_DEAL_UPDATES_CONSENT_VERSION as UPDATES_SERVER_VERSION,
} from "../netlify/functions/newBuyer.js";
import {
  BUYER_CONSENT_TEXT as DEAL_SERVER_TEXT,
  BUYER_DEAL_ALERTS_CONSENT_TEXT as DEAL_ALERTS_SERVER_TEXT,
  BUYER_DEAL_ALERTS_CONSENT_VERSION as DEAL_ALERTS_SERVER_VERSION,
  BUYER_DEAL_UPDATES_CONSENT_TEXT as DEAL_UPDATES_SERVER_TEXT,
  BUYER_DEAL_UPDATES_CONSENT_VERSION as DEAL_UPDATES_SERVER_VERSION,
} from "../netlify/functions/dealResponse.js";
import {
  BUYER_CONSENT_TEXT,
  BUYER_DEAL_ALERTS_CONSENT_TEXT,
  BUYER_DEAL_ALERTS_CONSENT_VERSION,
  BUYER_DEAL_UPDATES_CONSENT_TEXT,
  BUYER_DEAL_UPDATES_CONSENT_VERSION,
  BUYER_LINE,
  BUYER_LINE_E164,
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
// optional boxes below. The function sends its copy to dotato as the evidence.
test("the buyer form's consent wording matches what the server sends to dotato", () => {
  expect(BUYER_SERVER_TEXT).toBe(BUYER_CONSENT_TEXT);
  expect(BUYER_CONSENT_TEXT).toBe(
    "I agree to receive calls and emails from Hendrix Ventures Group LLC about investment inventory."
  );
  expect(BUYER_CONSENT_TEXT.toLowerCase()).not.toContain("text");
});

// The two optional texting boxes (investor deal-texts campaign). The A2P
// message flow quotes this wording, so the form, /investor-text-consent, the
// stored record and the registration must all say the same thing.
test("each buyer texting box's wording matches what the server records", () => {
  expect(ALERTS_SERVER_VERSION).toBe(BUYER_DEAL_ALERTS_CONSENT_VERSION);
  expect(ALERTS_SERVER_TEXT).toBe(BUYER_DEAL_ALERTS_CONSENT_TEXT);
  expect(UPDATES_SERVER_VERSION).toBe(BUYER_DEAL_UPDATES_CONSENT_VERSION);
  expect(UPDATES_SERVER_TEXT).toBe(BUYER_DEAL_UPDATES_CONSENT_TEXT);
});

// A deal page's interest and offer forms show the same three boxes and send
// their own copies to dotato as the evidence.
test("the deal page's consent wording matches what its function sends to dotato", () => {
  expect(DEAL_SERVER_TEXT).toBe(BUYER_CONSENT_TEXT);
  expect(DEAL_ALERTS_SERVER_VERSION).toBe(BUYER_DEAL_ALERTS_CONSENT_VERSION);
  expect(DEAL_ALERTS_SERVER_TEXT).toBe(BUYER_DEAL_ALERTS_CONSENT_TEXT);
  expect(DEAL_UPDATES_SERVER_VERSION).toBe(BUYER_DEAL_UPDATES_CONSENT_VERSION);
  expect(DEAL_UPDATES_SERVER_TEXT).toBe(BUYER_DEAL_UPDATES_CONSENT_TEXT);
});

const EVERY_DISCLOSURE = [
  "Hendrix Ventures Group LLC",
  "Msg frequency varies.",
  "Msg & data rates may apply.",
  "Reply STOP to opt out",
  "HELP for help",
  "not required to join the buyer list",
];

test("the deal-alerts box is the registered marketing wording, with every disclosure", () => {
  expect(BUYER_DEAL_ALERTS_CONSENT_TEXT).toBe(
    "I agree to receive recurring promotional text messages from Hendrix Ventures Group LLC with deal alerts about investment properties we have available, at the number provided. Msg frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help. Deal alerts are optional and not required to join the buyer list."
  );
  for (const d of EVERY_DISCLOSURE) expect(BUYER_DEAL_ALERTS_CONSENT_TEXT).toContain(d);
});

test("the deal-updates box is the registered informational wording, with every disclosure", () => {
  expect(BUYER_DEAL_UPDATES_CONSENT_TEXT).toBe(
    "I agree to receive text messages from Hendrix Ventures Group LLC with updates on deals I respond to, such as walkthrough times and offer status, at the number provided. Msg frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help. Deal updates are optional and not required to join the buyer list."
  );
  for (const d of EVERY_DISCLOSURE) expect(BUYER_DEAL_UPDATES_CONSENT_TEXT).toContain(d);
});

// Twilio error 30913: one box covering marketing and informational texts
// gets the campaign rejected. Each box must name only its own kind.
test("neither texting box covers the other's kind of text", () => {
  const alerts = BUYER_DEAL_ALERTS_CONSENT_TEXT.toLowerCase();
  const updates = BUYER_DEAL_UPDATES_CONSENT_TEXT.toLowerCase();
  for (const word of ["update", "respond", "walkthrough", "offer"]) {
    expect(alerts).not.toContain(word);
  }
  for (const word of ["alert", "promotional", "marketing", "recurring", "available"]) {
    expect(updates).not.toContain(word);
  }
  for (const box of [BUYER_DEAL_ALERTS_CONSENT_TEXT, BUYER_DEAL_UPDATES_CONSENT_TEXT]) {
    expect(box).not.toBe(CONSENT_TEXT);
  }
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
