/**
 * Wrap async route handlers so thrown errors are forwarded to the
 * central error handler instead of crashing the process.
 *
 * Usage: router.get('/', asyncHandler(async (req, res) => { ... }))
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
