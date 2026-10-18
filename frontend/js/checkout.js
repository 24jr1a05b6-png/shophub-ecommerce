/* =====================================================================
   checkout.js — checkout page (Cash on Delivery)
   Depends on: config.js, common.js
   ===================================================================== */

async function initCheckoutPage() {
  const form = document.getElementById('checkoutForm');
  if (!form) return;
  if (!requireAuth()) return;

  const summaryEl = document.getElementById('checkoutSummary');
  const user = currentUser() || {};

  // Pre-fill customer info from the logged-in user.
  const addr = user.address || {};
  form.fullName.value = user.name || '';
  form.email.value = user.email || '';
  form.phone.value = user.phone || '';
  form.address.value = addr.street || '';
  form.city.value = addr.city || '';
  form.state.value = addr.state || '';
  form.pincode.value = addr.pincode || '';
  form.country.value = addr.country || '';

  // Load cart for the order summary.
  try {
    const { cart, summary } = await apiFetch('/cart');

    if (!cart.items || cart.items.length === 0) {
      summaryEl.innerHTML = `
        <div class="empty-state" style="box-shadow:none;padding:30px 10px">
          <div class="empty-icon">🛒</div>
          <h3>Your cart is empty</h3>
          <a href="${ROOT}products.html" class="btn btn-primary mt-2">Browse Products</a>
        </div>`;
      form.querySelector('button[type="submit"]').disabled = true;
      return;
    }

    summaryEl.innerHTML = `
      <h3 class="mb-2">Order Summary</h3>
      ${cart.items
        .map(
          (i) => `
        <div class="summary-row">
          <span>${escapeHtml(i.product?.name || 'Item')} × ${i.quantity}</span>
          <span>${formatCurrency(i.price * i.quantity)}</span>
        </div>`
        )
        .join('')}
      <div class="summary-row total" style="font-size:.95rem"><span>Subtotal</span><span>${formatCurrency(summary.subtotal)}</span></div>
      <div class="summary-row"><span>Shipping</span><span>${summary.shipping === 0 ? 'FREE' : formatCurrency(summary.shipping)}</span></div>
      <div class="summary-row"><span>Tax (8%)</span><span>${formatCurrency(summary.tax)}</span></div>
      <div class="summary-row total"><span>Grand Total</span><span>${formatCurrency(summary.totalAmount)}</span></div>
      <div class="alert alert-info mt-3" style="font-size:.82rem">💵 Payment method: Cash on Delivery</div>`;
  } catch (err) {
    summaryEl.innerHTML = `<div class="alert alert-danger">${escapeHtml(err.message)}</div>`;
  }

  // Submit the order.
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const errorEl = document.getElementById('checkoutError');
    errorEl.textContent = '';

    const payload = {
      customerInfo: {
        fullName: form.fullName.value.trim(),
        email: form.email.value.trim(),
        phone: form.phone.value.trim(),
      },
      shippingAddress: {
        address: form.address.value.trim(),
        city: form.city.value.trim(),
        state: form.state.value.trim(),
        pincode: form.pincode.value.trim(),
        country: form.country.value.trim(),
      },
      paymentMethod: 'COD',
    };

    btn.disabled = true;
    btn.textContent = 'Placing order...';

    try {
      const { order } = await apiFetch('/orders', { method: 'POST', body: payload });
      refreshCartCount();
      toast('Order placed successfully!', 'success');
      showOrderSuccess(order);
    } catch (err) {
      errorEl.textContent = err.message;
      toast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Place Order';
    }
  });
}

/** Replace the checkout page with the success screen. */
function showOrderSuccess(order) {
  const container = document.getElementById('checkoutContainer');
  container.innerHTML = `
    <div class="order-success card" style="max-width:620px;margin:0 auto">
      <div class="check">✓</div>
      <h2>Order placed successfully!</h2>
      <p class="text-muted mt-1">Thank you for shopping with us. Your order has been received.</p>
      <div class="alert alert-success mt-3" style="justify-content:center">
        Order ID: <strong>${escapeHtml(order.orderId)}</strong>
      </div>
      <div class="flex gap-2 mt-2" style="justify-content:center;flex-wrap:wrap">
        <a href="${ROOT}order-details.html?id=${order._id}" class="btn btn-primary">Track Order</a>
        <a href="${ROOT}products.html" class="btn btn-light">Continue Shopping</a>
      </div>
    </div>`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.addEventListener('DOMContentLoaded', initCheckoutPage);
