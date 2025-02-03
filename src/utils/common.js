// common.js

export const formatPrice = (price) => {
  // Handle null/undefined inputs
  if (price == null) {
    return "Invalid Price";
  }

  // Ensure the input is a number
  if (typeof price !== "number") {
    price = parseFloat(price);
    if (Number.isNaN(price)) {
      return "Invalid Price";
    }
  }

  // Format the price with commas and a dollar sign
  return `$${price.toLocaleString("en-US")}`;
};
