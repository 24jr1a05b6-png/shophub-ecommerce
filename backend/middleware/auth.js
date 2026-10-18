const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * authenticateUser
 * Verifies that the request carries a valid JWT, loads the matching user,
 * and attaches it to req.user. Blocks the request otherwise.
 */
const authenticateUser = async (req, res, next) => {
  try {
    let token;

    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: 'Not authorized, please login to continue' });
    }

    // Verify token signature + expiry.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ensure the user still exists.
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: 'User no longer exists' });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, message: 'Not authorized, token failed or expired' });
  }
};

/**
 * authorizeAdmin
 * Must run AFTER authenticateUser(). Allows only admins through.
 */
const authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res
    .status(403)
    .json({ success: false, message: 'Access denied: admin privileges required' });
};

module.exports = { authenticateUser, authorizeAdmin };
