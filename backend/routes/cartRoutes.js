const express = require('express');

const {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} = require('../controllers/cartController');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

// Every cart route requires a logged-in user.
router.use(authenticateUser);

router.get('/', getCart); // GET    /api/cart
router.post('/', addToCart); // POST   /api/cart
router.put('/:productId', updateCartItem); // PUT    /api/cart/:productId
router.delete('/:productId', removeCartItem); // DELETE /api/cart/:productId
router.delete('/', clearCart); // DELETE /api/cart

module.exports = router;
