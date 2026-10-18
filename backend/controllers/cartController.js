const asyncHandler = require('../utils/asyncHandler');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { calculateTotals } = require('../utils/pricing');

/**
 * Helper: return a cart populated with product details and refreshed totals.
 */
const respondWithCart = async (res, cart) => {
  await cart.populate('items.product', 'name image price stock category');
  // Refresh totals from live product prices.
  cart.items = cart.items.map((item) => {
    if (item.product) item.price = item.product.price;
    return item;
  });
  cart.recalculateTotal();
  await cart.save();
  await cart.populate('items.product', 'name image price stock category');
  const totals = calculateTotals(cart.items);
  return res.json({ success: true, cart, summary: totals });
};

/**
 * @desc   Get the logged-in user's cart
 * @route  GET /api/cart
 * @access Private
 */
const getCart = asyncHandler(async (req, res) => {
  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [], totalAmount: 0 });
  }
  return respondWithCart(res, cart);
});

/**
 * @desc   Add a product to the cart (or increase quantity)
 * @route  POST /api/cart
 * @access Private
 * Body: { productId, quantity }
 */
const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  const qty = Math.max(1, parseInt(quantity, 10) || 1);

  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  if (product.stock <= 0) {
    res.status(400);
    throw new Error('Product is out of stock');
  }

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) cart = await Cart.create({ user: req.user._id, items: [] });

  const existing = cart.items.find((i) => i.product.toString() === productId);
  if (existing) {
    existing.quantity = Math.min(existing.quantity + qty, product.stock);
    existing.price = product.price;
  } else {
    cart.items.push({
      product: product._id,
      quantity: Math.min(qty, product.stock),
      price: product.price,
    });
  }

  cart.recalculateTotal();
  await cart.save();
  return respondWithCart(res, cart);
});

/**
 * @desc   Update the quantity of a cart item
 * @route  PUT /api/cart/:productId
 * @access Private
 * Body: { quantity }
 */
const updateCartItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const qty = parseInt(quantity, 10);

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    res.status(404);
    throw new Error('Cart not found');
  }

  const item = cart.items.find((i) => i.product.toString() === req.params.productId);
  if (!item) {
    res.status(404);
    throw new Error('Item not found in cart');
  }

  if (qty <= 0) {
    cart.items = cart.items.filter((i) => i.product.toString() !== req.params.productId);
  } else {
    const product = await Product.findById(req.params.productId);
    item.quantity = Math.min(qty, product ? product.stock : qty);
  }

  cart.recalculateTotal();
  await cart.save();
  return respondWithCart(res, cart);
});

/**
 * @desc   Remove a single item from the cart
 * @route  DELETE /api/cart/:productId
 * @access Private
 */
const removeCartItem = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    res.status(404);
    throw new Error('Cart not found');
  }

  cart.items = cart.items.filter((i) => i.product.toString() !== req.params.productId);
  cart.recalculateTotal();
  await cart.save();
  return respondWithCart(res, cart);
});

/**
 * @desc   Clear the entire cart
 * @route  DELETE /api/cart
 * @access Private
 */
const clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (cart) {
    cart.items = [];
    cart.totalAmount = 0;
    await cart.save();
  }
  res.json({ success: true, message: 'Cart cleared', cart: { items: [], totalAmount: 0 }, summary: calculateTotals([]) });
});

module.exports = { getCart, addToCart, updateCartItem, removeCartItem, clearCart };
