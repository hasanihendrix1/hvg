import { test, expect } from "vitest";
import { formatAddress } from "../src/data/deals.ts";

// Every shape below is a real record: the addresses are typed by hand, so the
// comma between street and city comes and goes.
test.each([
  [
    "1077 Washington Heights Terrace NWAtlanta, GA 30314",
    "1077 Washington Heights Terrace NW",
    "Atlanta",
    "1077 Washington Heights Terrace NW, Atlanta, GA 30314",
  ],
  [
    "586 S Gordon Rd SW Mableton, GA, 30126",
    "586 S Gordon Rd SW",
    "Mableton",
    "586 S Gordon Rd SW, Mableton, GA 30126",
  ],
  [
    "2259 Fernwood Dr Atlanta, GA 30344",
    "2259 Fernwood Dr",
    "Atlanta",
    "2259 Fernwood Dr, Atlanta, GA 30344",
  ],
  [
    "625 Glenforest Rd Sandy Springs, GA 30328",
    "625 Glenforest Rd",
    "Sandy Springs",
    "625 Glenforest Rd, Sandy Springs, GA 30328",
  ],
  [
    "3596 Carson Ln SE, Smyrna, GA 30080",
    "3596 Carson Ln SE",
    "Smyrna",
    "3596 Carson Ln SE, Smyrna, GA 30080",
  ],
  [
    "5984 Wellington Ave, Gainesville, GA 30506",
    "5984 Wellington Ave",
    "Gainesville",
    "5984 Wellington Ave, Gainesville, GA 30506",
  ],
])("%s", (raw, street, city, full) => {
  const locality = full.slice(street.length + 2);
  expect(formatAddress(raw)).toEqual({ street, city, locality, full });
});

test("a street that starts with a suffix word keeps its whole name", () => {
  expect(formatAddress("12 St Charles Ave NE Atlanta, GA 30308")).toEqual({
    street: "12 St Charles Ave NE",
    city: "Atlanta",
    locality: "Atlanta, GA 30308",
    full: "12 St Charles Ave NE, Atlanta, GA 30308",
  });
});

test("an address it cannot split is shown as typed, never guessed at", () => {
  expect(formatAddress("Lot 7 Peachtree Battle Atlanta, GA 30327")).toEqual({
    street: "Lot 7 Peachtree Battle Atlanta",
    city: "",
    locality: "GA 30327",
    full: "Lot 7 Peachtree Battle Atlanta, GA 30327",
  });
  expect(formatAddress("somewhere in Georgia")).toEqual({
    street: "somewhere in Georgia",
    city: "",
    locality: "",
    full: "somewhere in Georgia",
  });
});

// A wrong split shows a confident, wrong city; the typed text is the safer
// thing to show whenever what follows the street is not plainly a city name.
test.each([
  ["4500 Hwy 92 Douglasville, GA 30135", "4500 Hwy 92 Douglasville"],
  ["100 Main St Apt 4 Atlanta, GA 30303", "100 Main St Apt 4 Atlanta"],
  ["100 Main St, Apt 4 Atlanta, GA 30303", "100 Main St, Apt 4 Atlanta"],
])("%s is left unsplit", (raw, street) => {
  expect(formatAddress(raw)).toMatchObject({ street, city: "", full: raw });
});

test("a full stop after the street suffix stays with the street", () => {
  expect(formatAddress("123 Oak Dr. Atlanta, GA 30310")).toMatchObject({
    street: "123 Oak Dr.",
    city: "Atlanta",
    full: "123 Oak Dr., Atlanta, GA 30310",
  });
});

test("a nine-digit zip is kept whole", () => {
  expect(formatAddress("97 Delmoor Dr NW Atlanta, GA 30311-1234")).toMatchObject({
    city: "Atlanta",
    full: "97 Delmoor Dr NW, Atlanta, GA 30311-1234",
  });
});

// The investor feed's live rows are not filtered for an address the way the
// historical records are, and a throw here would take the whole list down.
test.each([[undefined], [null], [""]])("a missing address (%s) is empty, not a crash", (raw) => {
  expect(formatAddress(raw)).toEqual({
    street: "",
    city: "",
    locality: "",
    full: "",
  });
});

// "St" ends a street and starts a city ("St Louis", "St. Marys"); after
// another street word it is the city's, and the split is too unclear to make.
test.each([
  ["4243 E San Francisco Avenue St Louis, MO 63115", "4243 E San Francisco Avenue St Louis"],
  ["123 Oak Dr St. Marys, GA 31558", "123 Oak Dr St. Marys"],
])("%s keeps its saint", (raw, street) => {
  expect(formatAddress(raw)).toMatchObject({ street, city: "" });
});

test.each([
  ["100 Main St Unit B Atlanta, GA 30303", "100 Main St Unit B Atlanta"],
  ["100 Main St, Ste 200 Atlanta, GA 30303", "100 Main St, Ste 200 Atlanta"],
  ["123 Main St NE, GA 30303", "123 Main St NE"],
])("%s is not given a unit or a compass point as its city", (raw, street) => {
  expect(formatAddress(raw)).toMatchObject({ street, city: "" });
});

test("a city named for a saint still splits when the comma says where", () => {
  expect(formatAddress("4243 E San Francisco Ave, St Louis, MO 63115")).toMatchObject({
    street: "4243 E San Francisco Ave",
    city: "St Louis",
  });
});
