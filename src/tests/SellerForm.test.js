import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import SellerForm from "../components/sellers/SellerForm";

const fillForm = (utils, { name = "Test Seller", phone = "(404) 555-0142", address = "123 Main St NW, Atlanta, GA" } = {}) => {
  fireEvent.change(screen.getByLabelText("Full Name"), {
    target: { value: name },
  });
  fireEvent.change(screen.getByLabelText("Phone"), {
    target: { value: phone },
  });
  fireEvent.change(screen.getByLabelText("Property Address"), {
    target: { value: address },
  });
};

const submit = () =>
  fireEvent.click(screen.getByRole("button", { name: /get my offer now/i }));

afterEach(() => {
  delete global.fetch;
});

test("two instances render without duplicate element ids", () => {
  render(
    <>
      <SellerForm />
      <SellerForm />
    </>
  );
  const ids = Array.from(document.querySelectorAll("[id]")).map((el) => el.id);
  expect(ids.length).toBeGreaterThan(0);
  expect(new Set(ids).size).toBe(ids.length);
});

test("rejects an invalid phone number without calling the backend", () => {
  global.fetch = jest.fn();
  render(<SellerForm />);
  fillForm(null, { phone: "not-a-phone" });
  submit();
  expect(
    screen.getByText(/please enter a valid phone number/i)
  ).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
});

test("accepts a +1-prefixed phone number and shows success on 2xx", async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
  render(<SellerForm />);
  fillForm(null, { phone: "+1 (404) 555-0142" });
  submit();
  expect(
    await screen.findByText(/your offer request was sent successfully/i)
  ).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

// Regression test: the old form showed "sent successfully!" even when the
// backend returned 500, silently losing the lead.
test("shows an error with a phone fallback when the backend fails", async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });
  render(<SellerForm />);
  fillForm(null);
  submit();
  expect(
    await screen.findByText(/call or text us at \(678\) 710-5786/i)
  ).toBeInTheDocument();
  expect(
    screen.queryByText(/sent successfully/i)
  ).not.toBeInTheDocument();
});
