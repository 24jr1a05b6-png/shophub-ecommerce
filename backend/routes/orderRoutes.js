const express = require('express');
const { body } = require('express-validator');

const {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  getStats,
} = require('../controllers/orderController');
const { authenticateUser, authorizeAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// All order routes require authentication.
router.use(authenticateUser);

// Admin-only routes (declared before /:id so they are matched first)
router.get('/stats', authorizeAdmin, getStats);
router.get('/all', authorizeAdmin, getAllOrders);

// User routes
router.post(
  '/',
  [
    body('customerInfo.fullName').trim().notEmpty().withMessage('Full name is required'),
    body('customerInfo.email').trim().isEmail().withMessage('Valid email is required'),
    body('shippingAddress.address').trim().notEmpty().withMessage('Address is required'),
    body('shippingAddress.city').trim().notEmpty().withMessage('City is required'),
    body('shippingAddress.pincode').trim().notEmpty().withMessage('Pincode is required'),
  ],
  validate,
  createOrder
);
router.get('/', getMyOrders);
router.get('/:id', getOrderById);

// Admin updates order status
router.put('/:id/status', authorizeAdmin, updateOrderStatus);

module.exports = router;
