const { validationResult } = require('express-validator');

/**
 * validate
 * Collects errors produced by express-validator chains and, if any exist,
 * responds with 400 and a clean list of messages. Otherwise continues.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  return next();
};

module.exports = validate;
