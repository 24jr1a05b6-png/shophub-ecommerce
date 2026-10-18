const asyncHandler = require('../utils/asyncHandler');
const Product = require('../models/Product');

/**
 * @desc   List products with search, filtering, sorting and pagination
 * @route  GET /api/products
 * @access Public
 *
 * Query params:
 *   search   - text search across name/category/description
 *   category - filter by exact category
 *   minPrice - minimum price
 *   maxPrice - maximum price
 *   sort     - price_asc | price_desc | newest | oldest | rating | name
 *   featured - "true" to only show featured products
 *   page     - page number (default 1)
 *   limit    - results per page (default 12)
 */
const getProducts = asyncHandler(async (req, res) => {
  const {
    search = '',
    category = '',
    minPrice,
    maxPrice,
    sort = 'newest',
    featured,
    page = 1,
    limit = 12,
  } = req.query;

  const query = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  if (category) query.category = category;

  if (minPrice !== undefined || maxPrice !== undefined) {
    query.price = {};
    if (minPrice !== undefined && minPrice !== '') query.price.$gte = Number(minPrice);
    if (maxPrice !== undefined && maxPrice !== '') query.price.$lte = Number(maxPrice);
  }

  if (featured === 'true') query.featured = true;

  const sortMap = {
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    rating: { rating: -1 },
    name: { name: 1 },
  };
  const sortBy = sortMap[sort] || sortMap.newest;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const perPage = Math.max(1, parseInt(limit, 10) || 12);

  const total = await Product.countDocuments(query);
  const products = await Product.find(query)
    .sort(sortBy)
    .skip((pageNum - 1) * perPage)
    .limit(perPage);

  res.json({
    success: true,
    count: products.length,
    total,
    page: pageNum,
    pages: Math.ceil(total / perPage) || 1,
    products,
  });
});

/**
 * @desc   Get the list of distinct categories (for the navbar / filters)
 * @route  GET /api/products/categories
 * @access Public
 */
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Product.distinct('category');
  res.json({ success: true, categories });
});

/**
 * @desc   Get a single product by id
 * @route  GET /api/products/:id
 * @access Public
 */
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  res.json({ success: true, product });
});

/**
 * @desc   Create a product
 * @route  POST /api/products
 * @access Private/Admin
 */
const createProduct = asyncHandler(async (req, res) => {
  const { name, description, price, category, image, stock, rating, featured } = req.body;

  const product = await Product.create({
    name,
    description,
    price,
    category,
    image,
    stock: stock ?? 0,
    rating: rating ?? 0,
    featured: featured ?? false,
  });

  res.status(201).json({ success: true, message: 'Product created successfully', product });
});

/**
 * @desc   Update a product
 * @route  PUT /api/products/:id
 * @access Private/Admin
 */
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  const fields = ['name', 'description', 'price', 'category', 'image', 'stock', 'rating', 'featured'];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) product[field] = req.body[field];
  });

  const updated = await product.save();
  res.json({ success: true, message: 'Product updated successfully', product: updated });
});

/**
 * @desc   Delete a product
 * @route  DELETE /api/products/:id
 * @access Private/Admin
 */
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  await product.deleteOne();
  res.json({ success: true, message: 'Product deleted successfully' });
});

module.exports = {
  getProducts,
  getProductById,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
};
