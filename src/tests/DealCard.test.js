import React from "react";
import { render, screen } from "@testing-library/react";
import DealCard from "../components/buyers/DealCard";

// Regression test: a Sanity record with no status used to throw
// (deal.status.toLowerCase()) and white-screen the whole investor page.
test("renders without crashing when a deal has no status", () => {
  render(
    <DealCard
      deal={{
        _id: "test-deal",
        price: "100000",
        bedrooms: 3,
        bathrooms: 2,
        sqft: 1200,
        address: "123 Main St NW, Atlanta, GA",
        image: "https://example.com/photo.png",
        mediaLink: "https://example.com/media",
      }}
    />
  );
  expect(screen.getByText(/123 Main St NW/)).toBeInTheDocument();
});

test("normalizes pending statuses to Under Contract", () => {
  render(
    <DealCard
      deal={{
        _id: "test-deal-2",
        price: "250000",
        bedrooms: 4,
        bathrooms: 2,
        sqft: 1800,
        address: "456 Peachtree St, Atlanta, GA",
        image: "https://example.com/photo2.png",
        status: "Pending",
        mediaLink: "https://example.com/media2",
      }}
    />
  );
  expect(screen.getByText("Under Contract")).toBeInTheDocument();
});
