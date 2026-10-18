const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const Order = require('../models/Order');

/**
 * @desc   List all users
 * @route  GET /api/users
 * @access Private/Admin
 */
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.json({ success: true, count: users.length, users });
});

/**
 * @desc   Get a single user (admin, or the user themselves)
 * @route  GET /api/users/:id
 * @access Private/Admin
 */
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.json({ success: true, user });
});

/**
 * @desc   Update a user (role, name, phone, address). Admin only.
 * @route  PUT /api/users/:id
 * @access Private/Admin
 */
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const { name, email, role, phone, address } = req.body;
  if (name) user.name = name;
  if (email) user.email = email;
  if (role && ['user', 'admin'].includes(role)) user.role = role;
  if (phone !== undefined) user.phone = phone;
  if (address) user.address = { ...user.address?.toObject?.(), ...user.address, ...address };

  await user.save();
  res.json({ success: true, message: 'User updated successfully', user });
});

/**
 * @desc   Delete a user
 * @route  DELETE /api/users/:id
 * @access Private/Admin
 */
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  if (user.role === 'admin') {
    res.status(400);
    throw new Error('Admin accounts cannot be deleted');
  }
  await Order.deleteMany({ user: user._id }); // clean up their orders too
  await user.deleteOne();
  res.json({ success: true, message: 'User deleted successfully' });
});

module.exports = { getUsers, getUserById, updateUser, deleteUser };
