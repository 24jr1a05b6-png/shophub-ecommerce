# 🛍️ ShopHub — Full-Stack E-Commerce Web Application

A complete, modern, responsive online shopping platform built with **Node.js, Express, MongoDB (Mongoose), JWT authentication, and vanilla JavaScript**. Suitable for a college/project submission.

> **Shop Smarter. Live Better.** — Browse products, manage a cart, place orders, track deliveries, and administer the whole store from a dedicated admin panel.

---

## ✨ Features

### Customer
- Register / Login / Logout (JWT based)
- Browse products, search, filter by category & price, sort, paginate
- View detailed product pages with stock awareness
- Add to cart, change quantity, remove items, live cart totals
- Checkout with Cash on Delivery & a unique order ID
- View order history and track order status visually
- Manage profile and default address

### Admin
- Secure admin dashboard with statistics cards
- Charts: monthly revenue, products by category, order status
- Add / Edit / Delete products and update stock
- View all orders and update order status (7 states)
- View all users and change roles

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript (custom design system, no build step) |
| Backend | Node.js, Express.js, REST APIs |
| Database | MongoDB + Mongoose ODM |
| Auth | JWT + bcryptjs (hashed passwords), role-based middleware |
| Tooling | npm, Postman, Git/GitHub, VS Code |

---

## 📁 Project Structure

```
ecommerce-app/
├── backend/
│   ├── server.js                # Express app entry point
│   ├── package.json
│   ├── .env                     # secrets (NOT committed)
│   ├── .env.example
│   ├── config/db.js             # MongoDB connection
│   ├── models/                  # User, Product, Cart, Order
│   ├── middleware/              # auth, validate, errorHandler
│   ├── controllers/             # auth, product, cart, order, user
│   ├── routes/                  # auth, product, cart, order, user
│   ├── utils/                   # asyncHandler, pricing, generateToken, seed
│   └── tests/smoke.js           # integration test suite
│
└── frontend/
    ├── index.html               # Home
    ├── products.html            # Catalog
    ├── product-details.html
    ├── login.html / register.html
    ├── dashboard.html / cart.html / checkout.html
    ├── orders.html / order-details.html / profile.html
    ├── admin/
    │   ├── dashboard.html
    │   ├── products.html
    │   ├── add-product.html     # also used for editing (?id=...)
    │   ├── orders.html
    │   └── users.html
    ├── css/                     # style.css, responsive.css
    └── js/                      # config, common, auth, products, cart,
                                 # checkout, orders, admin
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** v18+ (tested on v24)
- **MongoDB** — either a local server *or* a free **MongoDB Atlas** cluster

### 2. Install dependencies
```bash
cd backend
npm install
```

### 3. Configure environment
Copy `backend/.env.example` to `backend/.env` and fill in your values:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/ecommerce
JWT_SECRET=your_long_random_secret
JWT_EXPIRES_IN=7d
PORT=5000
NODE_ENV=development
```
> ⚠️ **Never commit `.env`** (it is already listed in `.gitignore`).

For MongoDB Atlas use:
```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/ecommerce
```

### 4. Seed demo data (optional but recommended)
```bash
npm run seed
```
Creates demo users and 18 products.

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@shop.com` | `admin123` |
| Customer | `user@shop.com` | `user123` |

### 5. Run the app
```bash
npm start        # or: npm run dev  (auto-reload with nodemon)
```
Open **http://localhost:5000** — the Express server serves both the API **and** the frontend.

---

## 🧪 Running the Tests

An integration suite boots the real app against an in-memory MongoDB and exercises the full flow
(register → login → browse → cart → order → track → admin ops).

```bash
cd backend
npm test
```
> The first run downloads a MongoDB binary for `mongodb-memory-server`, so it needs internet access once.

---

## 🔌 API Reference

Base URL: `http://localhost:5000/api`

### Auth
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/auth/register` | Public | Register a new user |
| POST | `/auth/login` | Public | Login, returns JWT |
| GET | `/auth/me` | Private | Current user profile |
| PUT | `/auth/me` | Private | Update profile |

### Products
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/products` | Public | List + search/filter/sort/paginate |
| GET | `/products/categories` | Public | Distinct categories |
| GET | `/products/:id` | Public | Single product |
| POST | `/products` | Admin | Create product |
| PUT | `/products/:id` | Admin | Update product |
| DELETE | `/products/:id` | Admin | Delete product |

### Cart (Private)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/cart` | Get cart + summary |
| POST | `/cart` | Add `{ productId, quantity }` |
| PUT | `/cart/:productId` | Update quantity |
| DELETE | `/cart/:productId` | Remove one item |
| DELETE | `/cart` | Clear cart |

### Orders
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/orders` | Private | Place order from cart |
| GET | `/orders` | Private | My orders |
| GET | `/orders/:id` | Private | Order details (owner/admin) |
| GET | `/orders/all` | Admin | All orders |
| PUT | `/orders/:id/status` | Admin | Update status |
| GET | `/orders/stats` | Admin | Dashboard statistics |

### Users (Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List users |
| GET | `/users/:id` | Single user |
| PUT | `/users/:id` | Update user/role |
| DELETE | `/users/:id` | Delete user |

---

## 📦 Order Tracking States
`Pending → Confirmed → Processing → Shipped → Out for Delivery → Delivered` (or `Cancelled`)

---

## 🔐 Security
- Passwords hashed with **bcryptjs** (never stored or returned in plain text)
- **JWT** authentication with expiring tokens
- **Role-based authorization** middleware (`authenticateUser`, `authorizeAdmin`)
- Input validation via **express-validator**
- Centralised error handling (no stack traces leaked in production)
- **CORS** configuration and environment variables for all secrets

---

## 📱 Responsive Design
Works on desktop, laptop, tablet, and mobile — with a hamburger menu, stacked cards,
scrollable tables, and touch-friendly buttons.

---

## 🧩 Notes & Extensibility
- **Single command run:** the Express server also serves the `frontend/` folder, so no separate
  web server or build step is required.
- **Online payments:** the checkout is structured around `paymentMethod` (currently `COD`),
  so adding a gateway (Stripe/Razorpay) later means adding one field + one route.
- **Adding a product image:** paste any image URL in the admin "Add Product" form.

---

## 📄 License
MIT — free to use for learning and college projects.


