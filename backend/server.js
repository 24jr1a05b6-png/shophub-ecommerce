const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Route files
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const userRoutes = require('./routes/userRoutes');

// Connect to MongoDB
connectDB();

const app = express();

/* ----------------------------- Middleware ----------------------------- */
// Allow cross-origin requests (frontend may be served separately during dev).
app.use(
  cors({
    origin: process.env.CLIENT_URL || '*',
    credentials: true,
  })
);

// Parse JSON and url-encoded request bodies.
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging (skip during tests).
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

/* ------------------------- Static frontend files ---------------------- */
// Serve the frontend so the whole app runs from a single command.
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND_DIR));

/* ------------------------------- Routes ------------------------------- */
app.get('/api/health', (req, res) =>
  res.json({ success: true, message: 'API is running', time: new Date().toISOString() })
);

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);

// Fallback: send index.html for unknown non-API routes (SPA-friendly).
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

/* --------------------------- Error handling --------------------------- */
app.use(notFound);
app.use(errorHandler);

/* ------------------------------ Start up ------------------------------ */
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log('======================================================');
  console.log(`🚀 E-Commerce server running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`🌐 Open your browser at: http://localhost:${PORT}`);
  console.log(`📡 API base URL:         http://localhost:${PORT}/api`);
  console.log('======================================================');
});

// Handle unexpected promise rejections gracefully.
process.on('unhandledRejection', (err) => {
  console.error(`❌ Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

module.exports = app;
