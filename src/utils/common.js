// common.js

export const formatPrice = (price) => {
  // Ensure the input is a number
  if (typeof price !== "number") {
    price = parseFloat(price);
    if (isNaN(price)) {
      return "Invalid Price";
    }
  }

  // Format the price with commas and a dollar sign
  return `$${price.toLocaleString("en-US")}`;
};
