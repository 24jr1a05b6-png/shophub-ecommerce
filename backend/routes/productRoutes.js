const express = require('express');
const { body } = require('express-validator');

const {
  getProducts,
  getProductById,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const { authenticateUser, authorizeAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

const productValidation = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be zero or more'),
];

// Public routes
router.get('/', getProducts);
router.get('/categories', getCategories); // must be before /:id
router.get('/:id', getProductById);

// Admin-only routes
router.post('/', authenticateUser, authorizeAdmin, productValidation, validate, createProduct);
router.put('/:id', authenticateUser, authorizeAdmin, updateProduct);
router.delete('/:id', authenticateUser, authorizeAdmin, deleteProduct);

module.exports = router;
