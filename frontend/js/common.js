/* =====================================================================
   common.js — shared UI + API helpers used by every page
   Depends on: config.js
   ===================================================================== */

/* ------------------------------ API layer ---------------------------- */
/**
 * apiFetch — wraps fetch() with:
 *  - the API base URL
 *  - the JWT Authorization header (when logged in)
 *  - JSON body encoding/decoding
 *  - thrown errors with a readable message
 */
async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    options.body = JSON.stringify(options.body);
    headers['Content-Type'] = 'application/json';
  }

  const token = store.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (networkErr) {
    throw new Error('Unable to reach the server. Is the backend running?');
  }

  let data = {};
  try {
    data = await res.json();
  } catch {
    /* some responses (204) have no body */
  }

  if (!res.ok) {
    const error = new Error(data.message || `Request failed (${res.status})`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

/* ------------------------------- Toasts ------------------------------ */
function toast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✓', error: '⚠', warning: '⚠', info: 'ℹ' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ'}</span><span>${escapeHtml(
    message
  )}</span>`;
  container.appendChild(el);

  setTimeout(() => {
    el.classList.add('hide');
    setTimeout(() => el.remove(), 300);
  }, 3200);
}

/* ---------------------------- Confirm modal -------------------------- */
/**
 * confirmDialog — promise-based confirmation dialog.
 * Resolves true when confirmed, false when cancelled.
 */
function confirmDialog(message, opts = {}) {
  const { title = 'Are you sure?', confirmText = 'Confirm', danger = false } = opts;
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(message)}</p>
        <div class="modal-actions">
          <button class="btn btn-light" data-cancel>Cancel</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-confirm>${escapeHtml(
      confirmText
    )}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const close = (result) => {
      overlay.remove();
      resolve(result);
    };
    overlay.querySelector('[data-cancel]').onclick = () => close(false);
    overlay.querySelector('[data-confirm]').onclick = () => close(true);
    overlay.onclick = (e) => {
      if (e.target === overlay) close(false);
    };
  });
}

/* ---------------------------- Formatting ----------------------------- */
function formatCurrency(amount) {
  const n = Number(amount) || 0;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Render a 0-5 star rating as text stars. */
function starRating(rating = 0) {
  const full = Math.round(Number(rating) || 0);
  return `<span class="stars">${'★'.repeat(full)}${'☆'.repeat(5 - full)}</span>`;
}

/** Coloured badge for an order status. */
function statusBadge(status) {
  const cls = `badge badge-${String(status).replace(/\s+/g, '-')}`;
  return `<span class="${cls}">${escapeHtml(status)}</span>`;
}

/** Coloured chip describing stock availability. */
function stockBadge(stock) {
  if (stock <= 0) return `<span class="product-stock stock-out">Out of stock</span>`;
  if (stock <= 5) return `<span class="product-stock stock-low">Only ${stock} left</span>`;
  return `<span class="product-stock stock-in">In stock (${stock})</span>`;
}

/* -------------------------- Path / auth helpers ---------------------- */
// Admin pages live in /admin/, so links need a "../" prefix there.
const IS_ADMIN_DIR = window.location.pathname.includes('/admin/');
const ROOT = IS_ADMIN_DIR ? '../' : '';

function isLoggedIn() {
  return !!store.getToken();
}
function currentUser() {
  return store.getUser();
}
function isAdmin() {
  const u = currentUser();
  return !!u && u.role === 'admin';
}

/** Redirect to login if the visitor is not authenticated. Returns true when OK. */
function requireAuth() {
  if (isLoggedIn()) return true;
  toast('Please login to continue', 'warning');
  const here = location.pathname.split('/').pop() || 'index.html';
  setTimeout(() => (location.href = `${ROOT}login.html?redirect=${encodeURIComponent(here)}`), 700);
  return false;
}

/** Redirect unless the visitor is an authenticated admin. */
function requireAdmin() {
  if (!isLoggedIn()) return requireAuth();
  if (!isAdmin()) {
    toast('Access denied: admin privileges required', 'error');
    setTimeout(() => (location.href = `${ROOT}index.html`), 800);
    return false;
  }
  return true;
}

function logout() {
  store.clear();
  toast('You have been logged out', 'success');
  setTimeout(() => (location.href = `${ROOT}index.html`), 600);
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/* ---------------------------- Cart counter --------------------------- */
async function refreshCartCount() {
  const badge = document.querySelector('.cart-count');
  if (!badge) return;
  if (!isLoggedIn()) {
    badge.classList.add('hidden');
    return;
  }
  try {
    const { cart } = await apiFetch('/cart');
    const count = (cart.items || []).reduce((sum, i) => sum + i.quantity, 0);
    badge.textContent = count;
    badge.classList.toggle('hidden', count === 0);
  } catch {
    badge.classList.add('hidden');
  }
}

/* ---------------------------- Navbar render -------------------------- */
function renderNavbar() {
  const mount = document.getElementById('site-navbar');
  if (!mount) return;

  const user = currentUser();
  const logged = isLoggedIn();
  const admin = isAdmin();
  const page = location.pathname.split('/').pop() || 'index.html';
  const active = (file) => (page === file ? 'active' : '');

  const authArea = logged
    ? `
      <div class="nav-user" id="navUser">
        <button class="nav-user-toggle" id="navUserToggle">
          <span class="nav-avatar">${escapeHtml((user?.name || 'U').charAt(0).toUpperCase())}</span>
          <span>${escapeHtml((user?.name || '').split(' ')[0])}</span>
        </button>
        <div class="nav-dropdown">
          <a href="${ROOT}dashboard.html">📊 Dashboard</a>
          <a href="${ROOT}profile.html">👤 My Profile</a>
          <a href="${ROOT}orders.html">📦 My Orders</a>
          ${admin ? `<div class="divider"></div><a href="${ROOT}admin/dashboard.html">🛡️ Admin Panel</a>` : ''}
          <div class="divider"></div>
          <button id="logoutBtn">🚪 Logout</button>
        </div>
      </div>`
    : `
      <a href="${ROOT}login.html" class="btn btn-light btn-sm">Login</a>
      <a href="${ROOT}register.html" class="btn btn-primary btn-sm">Register</a>`;

  mount.outerHTML = `
    <header class="navbar" id="navbar">
      <div class="container">
        <a href="${ROOT}index.html" class="nav-logo">🛍️ <span>ShopHub</span></a>

        <button class="nav-toggle" id="navToggle" aria-label="Menu">☰</button>

        <nav class="nav-links">
          <a href="${ROOT}index.html" class="${active('index.html')}">Home</a>
          <a href="${ROOT}products.html" class="${active('products.html')}">Products</a>
          <a href="${ROOT}index.html#categories">Categories</a>
          ${logged && !admin ? `<a href="${ROOT}orders.html" class="${active('orders.html')}">My Orders</a>` : ''}
          ${admin ? `<a href="${ROOT}admin/dashboard.html">Admin</a>` : ''}
        </nav>

        <form class="nav-search" id="navSearchForm" role="search">
          <span class="search-icon">🔍</span>
          <input type="text" id="navSearchInput" placeholder="Search products..." autocomplete="off" />
        </form>

        <div class="nav-actions">
          <a href="${ROOT}cart.html" class="nav-cart btn btn-light btn-icon" title="Cart">🛒<span class="cart-count hidden">0</span></a>
          ${authArea}
        </div>
      </div>
    </header>`;

  const navbar = document.getElementById('navbar');
  const toggle = document.getElementById('navToggle');
  if (toggle) toggle.onclick = () => navbar.classList.toggle('menu-open');

  const userEl = document.getElementById('navUser');
  const userToggle = document.getElementById('navUserToggle');
  if (userEl && userToggle) {
    userToggle.onclick = (e) => {
      e.stopPropagation();
      userEl.classList.toggle('open');
    };
    document.addEventListener('click', () => userEl.classList.remove('open'));
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.onclick = logout;

  const searchForm = document.getElementById('navSearchForm');
  if (searchForm) {
    searchForm.onsubmit = (e) => {
      e.preventDefault();
      const q = document.getElementById('navSearchInput').value.trim();
      location.href = `${ROOT}products.html?search=${encodeURIComponent(q)}`;
    };
  }

  refreshCartCount();
}

/* ---------------------------- Footer render -------------------------- */
function renderFooter() {
  const mount = document.getElementById('site-footer');
  if (!mount) return;

  mount.outerHTML = `
    <footer class="footer">
      <div class="container">
        <div class="footer-grid">
          <div>
            <div class="footer-logo">🛍️ ShopHub</div>
            <p>Shop Smarter. Live Better. Your one-stop destination for quality products at unbeatable prices.</p>
            <div class="footer-social">
              <a href="#" aria-label="Facebook">f</a>
              <a href="#" aria-label="Twitter">t</a>
              <a href="#" aria-label="Instagram">i</a>
              <a href="#" aria-label="YouTube">▶</a>
            </div>
          </div>
          <div>
            <h4>Quick Links</h4>
            <a href="${ROOT}index.html">Home</a>
            <a href="${ROOT}products.html">Products</a>
            <a href="${ROOT}cart.html">Cart</a>
            <a href="${ROOT}orders.html">My Orders</a>
          </div>
          <div>
            <h4>Categories</h4>
            ${CATEGORIES.map((c) => `<a href="${ROOT}products.html?category=${encodeURIComponent(c.name)}">${c.name}</a>`).join('')}
          </div>
          <div>
            <h4>Company</h4>
            <a href="#">About Us</a>
            <a href="#">Contact</a>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>
        </div>
        <div class="footer-bottom">
          © ${new Date().getFullYear()} ShopHub. All rights reserved. Built with Node.js, Express &amp; MongoDB.
        </div>
      </div>
    </footer>`;
}

/* ---------------------------- Cart actions --------------------------- */
/**
 * addToCart — shared action used by product cards, the details page and more.
 * Redirects to login when the visitor is not authenticated.
 */
async function addToCart(productId, quantity = 1, opts = {}) {
  const { goToCart = false } = opts;
  if (!isLoggedIn()) {
    toast('Please login to continue', 'warning');
    setTimeout(() => (location.href = `${ROOT}login.html`), 700);
    return false;
  }

  try {
    await apiFetch('/cart', { method: 'POST', body: { productId, quantity } });
    toast('Product added to cart', 'success');
    refreshCartCount();
    if (goToCart) setTimeout(() => (location.href = `${ROOT}cart.html`), 500);
    return true;
  } catch (err) {
    toast(err.message, 'error');
    return false;
  }
}

/* ------------------------------ Bootstrap ---------------------------- */
// Every page calls this automatically once its DOM is ready.
function initLayout() {
  renderNavbar();
  renderFooter();
}

document.addEventListener('DOMContentLoaded', initLayout);



