/**
 * Seed script — populates the database with demo users and products.
 *
 * Run with:  npm run seed
 * (from inside the backend folder)
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Order = require('../models/Order');

const img = (seed) => `https://picsum.photos/seed/${seed}/600/450`;

const products = [
  { name: 'Wireless Noise-Cancelling Headphones', description: 'Premium over-ear headphones with active noise cancellation and 30-hour battery life.', price: 199.99, category: 'Electronics', stock: 25, rating: 4.7, featured: true, image: img('headphones') },
  { name: 'Smart Fitness Watch', description: 'Track your heart rate, sleep and workouts with a bright AMOLED display.', price: 149.5, category: 'Electronics', stock: 40, rating: 4.5, featured: true, image: img('smartwatch') },
  { name: 'Portable Bluetooth Speaker', description: 'Waterproof speaker with deep bass and 12 hours of playtime.', price: 59.99, category: 'Electronics', stock: 60, rating: 4.3, featured: false, image: img('speaker') },
  { name: '4K Ultra HD Smart TV', description: '55-inch smart TV with HDR and built-in streaming apps.', price: 499.0, category: 'Electronics', stock: 10, rating: 4.6, featured: false, image: img('tv') },
  { name: 'Classic Denim Jacket', description: 'Timeless denim jacket made from 100% cotton.', price: 79.99, category: 'Fashion', stock: 35, rating: 4.4, featured: true, image: img('denim') },
  { name: 'Cotton Casual T-Shirt', description: 'Soft breathable t-shirt available in multiple colours.', price: 19.99, category: 'Fashion', stock: 120, rating: 4.2, featured: false, image: img('tshirt') },
  { name: 'Slim Fit Chino Trousers', description: 'Smart-casual chinos with a comfortable stretch fabric.', price: 49.99, category: 'Fashion', stock: 50, rating: 4.1, featured: false, image: img('chino') },
  { name: 'Running Sports Shoes', description: 'Lightweight running shoes with responsive cushioning.', price: 89.99, category: 'Shoes', stock: 45, rating: 4.6, featured: true, image: img('runningshoes') },
  { name: 'Leather Formal Shoes', description: 'Handcrafted genuine leather shoes for a polished look.', price: 119.0, category: 'Shoes', stock: 20, rating: 4.5, featured: false, image: img('formalshoes') },
  { name: 'Canvas Sneakers', description: 'Everyday canvas sneakers with a durable rubber sole.', price: 39.99, category: 'Shoes', stock: 80, rating: 4.0, featured: false, image: img('sneakers') },
  { name: 'Leather Wallet', description: 'Slim RFID-blocking wallet with multiple card slots.', price: 29.99, category: 'Accessories', stock: 70, rating: 4.4, featured: false, image: img('wallet') },
  { name: 'Polarized Sunglasses', description: 'UV400 polarized sunglasses with a lightweight frame.', price: 34.5, category: 'Accessories', stock: 55, rating: 4.3, featured: false, image: img('sunglasses') },
  { name: 'Minimalist Backpack', description: 'Water-resistant backpack with a padded laptop sleeve.', price: 64.99, category: 'Accessories', stock: 30, rating: 4.5, featured: true, image: img('backpack') },
  { name: 'Aromatherapy Diffuser', description: 'Ultrasonic essential oil diffuser with soothing LED light.', price: 44.99, category: 'Home & Living', stock: 40, rating: 4.2, featured: false, image: img('diffuser') },
  { name: 'Ceramic Dinner Set', description: '16-piece ceramic dinner set, dishwasher safe.', price: 89.0, category: 'Home & Living', stock: 18, rating: 4.4, featured: false, image: img('dinnerset') },
  { name: 'Scented Candle Trio', description: 'Set of three hand-poured soy wax candles.', price: 24.99, category: 'Home & Living', stock: 90, rating: 4.6, featured: true, image: img('candles') },
  { name: 'Vitamin C Face Serum', description: 'Brightening serum with hyaluronic acid for glowing skin.', price: 22.99, category: 'Beauty', stock: 65, rating: 4.7, featured: true, image: img('serum') },
  { name: 'Luxury Perfume', description: 'Long-lasting eau de parfum with floral and woody notes.', price: 74.5, category: 'Beauty', stock: 25, rating: 4.5, featured: false, image: img('perfume') },
];

const run = async () => {
  try {
    await connectDB();

    console.log('🧹 Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Product.deleteMany({}),
      Cart.deleteMany({}),
      Order.deleteMany({}),
    ]);

    console.log('👤 Creating demo users...');
    // Passwords are hashed automatically by the User model pre-save hook.
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@shop.com',
      password: 'admin123',
      role: 'admin',
      phone: '9876543210',
    });
    const customer = await User.create({
      name: 'John Customer',
      email: 'user@shop.com',
      password: 'user123',
      role: 'user',
      phone: '9123456780',
      address: { street: '12 MG Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560001', country: 'India' },
    });

    console.log('📦 Inserting products...');
    await Product.insertMany(products);

    console.log('✅ Seed complete!\n');
    console.log('   Admin   ->  admin@shop.com / admin123');
    console.log('   Customer->  user@shop.com  / user123');
    console.log(`   Products inserted: ${products.length}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

run();
