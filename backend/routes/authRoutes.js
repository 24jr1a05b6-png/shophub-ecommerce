const express = require('express');
const { body } = require('express-validator');

const {
  registerUser,
  loginUser,
  getMe,
  updateMe,
} = require('../controllers/authController');
const { authenticateUser } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// POST /api/auth/register
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').trim().isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('confirmPassword')
      .custom((value, { req }) => value === req.body.password)
      .withMessage('Passwords do not match'),
  ],
  validate,
  registerUser
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').trim().isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  loginUser
);

// GET /api/auth/me  (current profile)
router.get('/me', authenticateUser, getMe);

// PUT /api/auth/me  (update profile)
router.put(
  '/me',
  authenticateUser,
  [body('name').optional().trim().notEmpty().withMessage('Name cannot be empty')],
  validate,
  updateMe
);

module.exports = router;
