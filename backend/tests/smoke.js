/* =====================================================================
   Integration smoke test
   ---------------------------------------------------------------------
   Boots the real Express app against an in-memory MongoDB
   (mongodb-memory-server) and exercises the full user + admin flow:
     register -> login -> browse -> cart -> order -> track -> admin ops
   Run with:  npm test
   ===================================================================== */

process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT || '5099';
process.env.JWT_SECRET = 'test_secret_key';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const BASE = `http://127.0.0.1:${process.env.PORT}/api`;

let passed = 0;
let failed = 0;

/** Tiny assertion helper that logs and counts results. */
function check(name, condition) {
  if (condition) {
    passed += 1;
    console.log(`  OK   ${name}`);
  } else {
    failed += 1;
    console.error(`  FAIL ${name}`);
  }
}

/** fetch() wrapper that returns { status, body }. */
async function req(method, path, { token, body } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = {};
  try {
    json = await res.json();
  } catch {
    /* no body */
  }
  return { status: res.status, body: json };
}

async function run() {
  console.log('\nStarting in-memory MongoDB...');
  const mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri('ecommerce_test');

  console.log('Booting Express app...');
  require('../server.js'); // connects to Mongo + starts listening on PORT

  // Give the server a moment to bind the port.
  await new Promise((r) => setTimeout(r, 2000));

  console.log('\n=== HEALTH ===');
  const health = await req('GET', '/health');
  check('GET /health returns 200', health.status === 200 && health.body.success === true);

  console.log('\n=== AUTH ===');
  const reg = await req('POST', '/auth/register', {
    body: {
      name: 'Test Customer',
      email: 'test@user.com',
      password: 'secret123',
      confirmPassword: 'secret123',
    },
  });
  check('register creates a user + token', reg.status === 201 && !!reg.body.token);
  check('register never returns password', reg.body.user && reg.body.user.password === undefined);

  const dupe = await req('POST', '/auth/register', {
    body: {
      name: 'Test Customer',
      email: 'test@user.com',
      password: 'secret123',
      confirmPassword: 'secret123',
    },
  });
  check('duplicate email is rejected (400)', dupe.status === 400);

  const badLogin = await req('POST', '/auth/login', {
    body: { email: 'test@user.com', password: 'wrongpass' },
  });
  check('wrong password is rejected (401)', badLogin.status === 401);

  const login = await req('POST', '/auth/login', {
    body: { email: 'test@user.com', password: 'secret123' },
  });
  check('login returns a JWT', login.status === 200 && !!login.body.token);
  const userToken = login.body.token;

  const me = await req('GET', '/auth/me', { token: userToken });
  check('GET /auth/me returns the profile', me.status === 200 && me.body.user.email === 'test@user.com');

  const noToken = await req('GET', '/auth/me');
  check('protected route blocks anonymous access (401)', noToken.status === 401);

  console.log('\n=== PRODUCTS (admin CRUD + permissions) ===');
  // Seed an admin directly through the model so we can test admin routes.
  // NOTE: the User model hashes the password in a pre-save hook, so we pass
  // the plain password here (do NOT hash it ourselves).
  const User = require('../models/User');
  await User.create({
    name: 'Test Admin',
    email: 'test@admin.com',
    password: 'admin123',
    role: 'admin',
  });
  const adminLogin = await req('POST', '/auth/login', {
    body: { email: 'test@admin.com', password: 'admin123' },
  });
  const adminToken = adminLogin.body.token;
  check('admin can log in', adminLogin.status === 200 && adminLogin.body.user.role === 'admin');

  const forbidden = await req('POST', '/products', {
    token: userToken,
    body: { name: 'Hacker Item', description: 'nope', price: 1, category: 'X', stock: 1 },
  });
  check('normal user cannot create products (403)', forbidden.status === 403);

  const created = await req('POST', '/products', {
    token: adminToken,
    body: {
      name: 'Test Widget',
      description: 'A widget for testing',
      price: 25.5,
      category: 'Electronics',
      stock: 10,
      rating: 4.5,
    },
  });
  check('admin creates a product (201)', created.status === 201 && !!created.body.product._id);
  const productId = created.body.product._id;

  const list = await req('GET', '/products?search=Widget');
  check('product search finds the product', list.status === 200 && list.body.total >= 1);

  const filtered = await req('GET', '/products?category=Electronics&minPrice=10&maxPrice=50');
  check('category + price filter works', filtered.status === 200 && filtered.body.products.length >= 1);

  const sorted = await req('GET', '/products?sort=price_asc');
  check('sorting by price asc works', sorted.status === 200);

  const single = await req('GET', `/products/${productId}`);
  check('GET single product works', single.status === 200 && single.body.product.name === 'Test Widget');

  const updated = await req('PUT', `/products/${productId}`, { token: adminToken, body: { stock: 3 } });
  check('admin updates product stock', updated.status === 200 && updated.body.product.stock === 3);

  console.log('\n=== CART ===');
  const emptyCart = await req('GET', '/cart', { token: userToken });
  check('cart starts empty', emptyCart.status === 200 && emptyCart.body.cart.items.length === 0);

  const add = await req('POST', '/cart', { token: userToken, body: { productId, quantity: 2 } });
  check('add to cart works', add.status === 200 && add.body.cart.items.length === 1);
  check('cart summary totals are computed', add.body.summary.subtotal === 51);

  const updateQty = await req('PUT', `/cart/${productId}`, { token: userToken, body: { quantity: 3 } });
  check('update cart quantity works', updateQty.status === 200 && updateQty.body.cart.items[0].quantity === 3);

  console.log('\n=== ORDERS ===');
  const order = await req('POST', '/orders', {
    token: userToken,
    body: {
      customerInfo: { fullName: 'Test Customer', email: 'test@user.com', phone: '9999999999' },
      shippingAddress: {
        address: '1 Test St',
        city: 'Testville',
        state: 'TS',
        pincode: '123456',
        country: 'India',
      },
      paymentMethod: 'COD',
    },
  });
  check('order is created (201)', order.status === 201 && !!order.body.order.orderId);
  check('order has Pending status', order.body.order.status === 'Pending');
  const orderId = order.body.order._id;

  const cartAfter = await req('GET', '/cart', { token: userToken });
  check('cart is emptied after ordering', cartAfter.body.cart.items.length === 0);

  const stockAfter = await req('GET', `/products/${productId}`);
  check('stock is reduced after ordering', stockAfter.body.product.stock === 0);

  const oversell = await req('POST', '/cart', { token: userToken, body: { productId, quantity: 1 } });
  check('out-of-stock product cannot be added (400)', oversell.status === 400);

  const myOrders = await req('GET', '/orders', { token: userToken });
  check('user sees their own orders', myOrders.status === 200 && myOrders.body.orders.length === 1);

  const singleOrder = await req('GET', `/orders/${orderId}`, { token: userToken });
  check('user can view order details', singleOrder.status === 200);

  const userCannotUpdateStatus = await req('PUT', `/orders/${orderId}/status`, {
    token: userToken,
    body: { status: 'Shipped' },
  });
  check('user cannot update order status (403)', userCannotUpdateStatus.status === 403);

  const adminUpdate = await req('PUT', `/orders/${orderId}/status`, {
    token: adminToken,
    body: { status: 'Shipped' },
  });
  check('admin updates order status', adminUpdate.status === 200 && adminUpdate.body.order.status === 'Shipped');

  const badStatus = await req('PUT', `/orders/${orderId}/status`, {
    token: adminToken,
    body: { status: 'Teleported' },
  });
  check('invalid order status is rejected (400)', badStatus.status === 400);

  console.log('\n=== ADMIN STATS + USERS ===');
  const stats = await req('GET', '/orders/stats', { token: adminToken });
  check('admin stats load', stats.status === 200 && stats.body.stats.totalOrders === 1);
  check('stats include a sales total', typeof stats.body.stats.totalSales === 'number');
  check('stats include chart data', Array.isArray(stats.body.charts.productsByCategory));

  const userStats = await req('GET', '/orders/stats', { token: userToken });
  check('normal user cannot read admin stats (403)', userStats.status === 403);

  const users = await req('GET', '/users', { token: adminToken });
  check('admin lists users', users.status === 200 && users.body.users.length >= 2);
  check('user list hides passwords', users.body.users.every((u) => u.password === undefined));

  const userListForbidden = await req('GET', '/users', { token: userToken });
  check('normal user cannot list users (403)', userListForbidden.status === 403);

  console.log('\n=== VALIDATION & 404 ===');
  const badRegister = await req('POST', '/auth/register', {
    body: { name: '', email: 'not-an-email', password: '123', confirmPassword: '456' },
  });
  check('invalid registration is rejected (400)', badRegister.status === 400);

  const notFound = await req('GET', '/this-route-does-not-exist');
  check('unknown API route returns 404', notFound.status === 404);

  console.log('\n=== FRONTEND SERVED ===');
  const indexRes = await fetch(`http://127.0.0.1:${process.env.PORT}/index.html`);
  const indexHtml = await indexRes.text();
  check('index.html is served', indexRes.status === 200 && indexHtml.includes('ShopHub'));

  const cssRes = await fetch(`http://127.0.0.1:${process.env.PORT}/css/style.css`);
  check('style.css is served', cssRes.status === 200);

  // ---------------------------------------------------------------
  console.log('\n=========================================');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('=========================================\n');

  await mongoose.connection.close();
  await mongo.stop();
  process.exit(failed === 0 ? 0 : 1);
}

run().catch(async (err) => {
  console.error('Test run crashed:', err);
  try {
    await mongoose.connection.close();
  } catch {
    /* ignore */
  }
  process.exit(1);
});


