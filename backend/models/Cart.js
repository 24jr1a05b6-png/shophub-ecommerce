const mongoose = require('mongoose');

/**
 * Cart Model
 * Each registered user has exactly one persistent cart document.
 */
const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
    // Price captured when the item was added (for reference).
    price: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
    totalAmount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

/**
 * Recalculate totalAmount from the current items.
 */
cartSchema.methods.recalculateTotal = function recalculateTotal() {
  this.totalAmount = this.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  return this.totalAmount;
};

module.exports = mongoose.model('Cart', cartSchema);
