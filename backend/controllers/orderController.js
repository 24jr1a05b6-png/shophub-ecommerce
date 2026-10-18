const asyncHandler = require('../utils/asyncHandler');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');
const { calculateTotals } = require('../utils/pricing');
const { generateOrderId } = require('../utils/generateToken');

/**
 * @desc   Create an order from the user's current cart
 * @route  POST /api/orders
 * @access Private
 * Body: { customerInfo:{fullName,email,phone}, shippingAddress:{...}, paymentMethod }
 */
const createOrder = asyncHandler(async (req, res) => {
  const { customerInfo = {}, shippingAddress = {}, paymentMethod = 'COD' } = req.body;

  const cart = await Cart.findOne({ user: req.user._id }).populate(
    'items.product',
    'name image price stock'
  );

  if (!cart || cart.items.length === 0) {
    res.status(400);
    throw new Error('Your cart is empty');
  }

  // Validate stock + build the order item snapshot.
  const orderItems = [];
  for (const item of cart.items) {
    const product = item.product;
    if (!product) {
      res.status(400);
      throw new Error('A product in your cart no longer exists');
    }
    if (product.stock < item.quantity) {
      res.status(400);
      throw new Error(`Insufficient stock for "${product.name}" (available: ${product.stock})`);
    }
    orderItems.push({
      product: product._id,
      name: product.name,
      image: product.image,
      price: product.price,
      quantity: item.quantity,
    });
  }

  const totals = calculateTotals(orderItems);

  const order = await Order.create({
    orderId: generateOrderId(),
    user: req.user._id,
    items: orderItems,
    customerInfo: {
      fullName: customerInfo.fullName || req.user.name,
      email: customerInfo.email || req.user.email,
      phone: customerInfo.phone || req.user.phone || '',
    },
    shippingAddress,
    paymentMethod: paymentMethod === 'Online' ? 'Online' : 'COD',
    subtotal: totals.subtotal,
    shipping: totals.shipping,
    tax: totals.tax,
    totalAmount: totals.totalAmount,
    status: 'Pending',
    orderDate: new Date(),
  });

  // Reduce stock for each ordered product.
  await Promise.all(
    orderItems.map((item) =>
      Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } })
    )
  );

  // Empty the cart now that the order has been placed.
  cart.items = [];
  cart.totalAmount = 0;
  await cart.save();

  res.status(201).json({
    success: true,
    message: 'Order placed successfully!',
    order,
  });
});

/**
 * @desc   Get all orders belonging to the logged-in user
 * @route  GET /api/orders
 * @access Private
 */
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, count: orders.length, orders });
});

/**
 * @desc   Get all orders (admin) with optional status filter
 * @route  GET /api/orders/all
 * @access Private/Admin
 */
const getAllOrders = asyncHandler(async (req, res) => {
  const { status = '', q = '' } = req.query;
  const query = {};
  if (status) query.status = status;
  if (q) {
    query.$or = [
      { orderId: { $regex: q, $options: 'i' } },
      { 'customerInfo.fullName': { $regex: q, $options: 'i' } },
      { 'customerInfo.email': { $regex: q, $options: 'i' } },
    ];
  }

  const orders = await Order.find(query).populate('user', 'name email').sort({ createdAt: -1 });

  res.json({ success: true, count: orders.length, orders });
});

/**
 * @desc   Get a single order by id (owner or admin)
 * @route  GET /api/orders/:id
 * @access Private
 */
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email');
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const isOwner = order.user && order.user._id.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('You are not allowed to view this order');
  }

  res.json({ success: true, order });
});

/**
 * @desc   Update an order's status
 * @route  PUT /api/orders/:id/status
 * @access Private/Admin
 * Body: { status }
 */
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!Order.ORDER_STATUSES.includes(status)) {
    res.status(400);
    throw new Error('Invalid order status');
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  order.status = status;
  await order.save();

  res.json({ success: true, message: 'Order status updated successfully', order });
});

/**
 * @desc   Aggregate statistics for the admin dashboard
 * @route  GET /api/orders/stats
 * @access Private/Admin
 */
const getStats = asyncHandler(async (req, res) => {
  const [totalOrders, totalUsers, totalProducts, pendingOrders, completedOrders, salesAgg] =
    await Promise.all([
      Order.countDocuments(),
      User.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments({ status: 'Pending' }),
      Order.countDocuments({ status: 'Delivered' }),
      Order.aggregate([
        { $match: { status: { $ne: 'Cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
    ]);

  const totalSales = salesAgg.length ? Number(salesAgg[0].total.toFixed(2)) : 0;

  // Orders grouped by status (for the doughnut chart).
  const ordersByStatus = await Order.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  // Products grouped by category.
  const productsByCategory = await Product.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);

  // Monthly revenue for the last 6 months (bar/line chart).
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const monthlyRevenue = await Order.aggregate([
    { $match: { createdAt: { $gte: sixMonthsAgo }, status: { $ne: 'Cancelled' } } },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        revenue: { $sum: '$totalAmount' },
        orders: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  // Most recent orders for the dashboard table.
  const recentOrders = await Order.find()
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .limit(5);

  res.json({
    success: true,
    stats: { totalOrders, totalUsers, totalProducts, pendingOrders, completedOrders, totalSales },
    charts: {
      ordersByStatus: ordersByStatus.map((o) => ({ status: o._id, count: o.count })),
      productsByCategory: productsByCategory.map((p) => ({ category: p._id, count: p.count })),
      monthlyRevenue: monthlyRevenue.map((m) => ({
        label: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
        revenue: Number(m.revenue.toFixed(2)),
        orders: m.orders,
      })),
    },
    recentOrders,
  });
});

module.exports = {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  getStats,
};
