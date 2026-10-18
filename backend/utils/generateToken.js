const jwt = require('jsonwebtoken');

/**
 * Create a signed JWT for a given user id.
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * Generate a human friendly, unique-enough order id.
 * Example: ORD-2026-9F3A21
 */
const generateOrderId = () => {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${year}-${random}`;
};

module.exports = { generateToken, generateOrderId };
