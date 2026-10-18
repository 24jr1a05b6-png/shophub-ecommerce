const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const { generateToken } = require('../utils/generateToken');

/**
 * @desc   Register a new user
 * @route  POST /api/auth/register
 * @access Public
 */
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Prevent duplicate email registration.
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    res.status(400);
    throw new Error('An account with this email already exists');
  }

  // The password is hashed automatically by the User model pre-save hook.
  const user = await User.create({ name, email, password, role: 'user' });

  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      address: user.address,
      createdAt: user.createdAt,
    },
  });
});

/**
 * @desc   Authenticate a user and return a JWT
 * @route  POST /api/auth/login
 * @access Public
 */
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // We must explicitly select password because the schema hides it by default.
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  const token = generateToken(user._id);

  res.json({
    success: true,
    message: 'Login successful',
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      address: user.address,
      createdAt: user.createdAt,
    },
  });
});

/**
 * @desc   Get the currently logged-in user's profile
 * @route  GET /api/auth/me
 * @access Private
 */
const getMe = asyncHandler(async (req, res) => {
  // req.user is populated by authenticateUser middleware.
  res.json({ success: true, user: req.user });
});

/**
 * @desc   Update the logged-in user's profile
 * @route  PUT /api/auth/me
 * @access Private
 */
const updateMe = asyncHandler(async (req, res) => {
  const { name, phone, address, password } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (address) user.address = { ...user.address?.toObject?.(), ...user.address, ...address };
  if (password) user.password = password; // re-hashed by pre-save hook

  const updated = await user.save();

  res.json({
    success: true,
    message: 'Profile updated successfully',
    user: {
      _id: updated._id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      phone: updated.phone,
      address: updated.address,
      createdAt: updated.createdAt,
    },
  });
});

module.exports = { registerUser, loginUser, getMe, updateMe };
