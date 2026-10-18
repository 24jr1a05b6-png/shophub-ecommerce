/**
 * Shared pricing rules used by both the cart summary and order creation.
 * Keeping them in one place guarantees the numbers always match.
 */

const FREE_SHIPPING_THRESHOLD = 100; // free shipping for orders over this amount
const SHIPPING_FEE = 10; // flat fee below the threshold
const TAX_RATE = 0.08; // 8% sales tax

/**
 * Calculate subtotal, shipping, tax and grand total from line items.
 * @param {Array<{price:number, quantity:number}>} items
 */
const calculateTotals = (items = []) => {
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.quantity),
    0
  );

  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const tax = Number((subtotal * TAX_RATE).toFixed(2));
  const totalAmount = Number((subtotal + shipping + tax).toFixed(2));

  return {
    subtotal: Number(subtotal.toFixed(2)),
    shipping: Number(shipping.toFixed(2)),
    tax,
    totalAmount,
  };
};

module.exports = {
  calculateTotals,
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FEE,
  TAX_RATE,
};
