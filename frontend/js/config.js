/* =====================================================================
   config.js — shared configuration and tiny helpers
   Loaded first on every page.
   ===================================================================== */

// When the frontend is served by the Express server, the API lives on the
// same origin. If you open the HTML files directly (file://) or host the
// frontend elsewhere, change this to e.g. 'http://localhost:5000'.
const API_BASE = window.location.origin.startsWith('http')
  ? `${window.location.origin}/api`
  : 'http://localhost:5000/api';

const STORAGE_KEYS = {
  TOKEN: 'shophub_token',
  USER: 'shophub_user',
};

// Small, safe wrapper around localStorage.
const store = {
  getToken: () => localStorage.getItem(STORAGE_KEYS.TOKEN),
  setToken: (t) => localStorage.setItem(STORAGE_KEYS.TOKEN, t),
  getUser: () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || 'null');
    } catch {
      return null;
    }
  },
  setUser: (u) => localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(u)),
  clear: () => {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  },
};

// All product categories used across the store (icons are emojis).
const CATEGORIES = [
  { name: 'Electronics', icon: '💻' },
  { name: 'Fashion', icon: '👕' },
  { name: 'Shoes', icon: '👟' },
  { name: 'Accessories', icon: '🎒' },
  { name: 'Home & Living', icon: '🛋️' },
  { name: 'Beauty', icon: '💄' },
];

// The seven order tracking states, in order.
const ORDER_STATUSES = [
  'Pending',
  'Confirmed',
  'Processing',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];
