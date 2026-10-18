/* =====================================================================
   cart.js — shopping cart page
   Depends on: config.js, common.js
   The /api/cart endpoints return { cart, summary } where summary holds the
   server-computed subtotal, shipping, tax and totalAmount.
   ===================================================================== */

async function initCartPage() {
  const mount = document.getElementById('cartItems');
  if (!mount) return;
  if (!requireAuth()) return;

  const summaryEl = document.getElementById('cartSummary');

  const renderSummary = (summary, isEmpty) => {
    summaryEl.innerHTML = `
      <h3 class="mb-2">Order Summary</h3>
      <div class="summary-row"><span>Subtotal</span><span>${formatCurrency(summary.subtotal)}</span></div>
      <div class="summary-row"><span>Shipping</span><span>${summary.shipping === 0 ? 'FREE' : formatCurrency(summary.shipping)}</span></div>
      <div class="summary-row"><span>Tax (8%)</span><span>${formatCurrency(summary.tax)}</span></div>
      <div class="summary-row total"><span>Total</span><span>${formatCurrency(summary.totalAmount)}</span></div>
      <button class="btn btn-primary btn-block mt-3" id="checkoutBtn" ${isEmpty ? 'disabled' : ''}>Proceed to Checkout →</button>
      <a href="${ROOT}products.html" class="btn btn-light btn-block mt-2">← Continue Shopping</a>
      ${isEmpty ? '' : '<button class="btn btn-block mt-2" style="color:var(--danger)" id="clearCartBtn">Clear Cart</button>'}
      <div class="alert alert-info mt-3" style="font-size:.82rem">🚚 Free shipping on orders over $100!</div>`;

    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) checkoutBtn.onclick = () => (location.href = `${ROOT}checkout.html`);

    const clearBtn = document.getElementById('clearCartBtn');
    if (clearBtn) {
      clearBtn.onclick = async () => {
        const ok = await confirmDialog('Clear all items from your cart?', {
          title: 'Clear cart',
          confirmText: 'Clear all',
          danger: true,
        });
        if (!ok) return;
        await mutate(() => apiFetch('/cart', { method: 'DELETE' }), 'Cart cleared');
      };
    }
  };

  const renderItem = (item) => {
    const p = item.product || {};
    return `
      <div class="cart-item" data-id="${p._id}">
        <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}"
             onerror="this.src='https://via.placeholder.com/200?text=Item'" />
        <div>
          <h4><a href="${ROOT}product-details.html?id=${p._id}">${escapeHtml(p.name)}</a></h4>
          <div class="cart-item-price">${formatCurrency(item.price)}</div>
          <div class="text-muted" style="font-size:.85rem">${escapeHtml(p.category || '')}</div>
        </div>
        <div class="cart-item-actions" style="text-align:right">
          <div class="qty-input" style="margin-bottom:10px">
            <button type="button" data-act="dec">−</button>
            <input type="text" value="${item.quantity}" readonly />
            <button type="button" data-act="inc">+</button>
          </div>
          <div style="font-weight:700">${formatCurrency(item.price * item.quantity)}</div>
          <button class="btn btn-sm" style="color:var(--danger);margin-top:8px" data-act="remove">🗑 Remove</button>
        </div>
      </div>`;
  };

  const bindItemEvents = (cart) => {
    mount.querySelectorAll('.cart-item').forEach((row) => {
      const id = row.dataset.id;
      const item = cart.items.find((i) => (i.product?._id || i.product) === id);
      const max = item?.product?.stock ?? 999;

      row.querySelectorAll('[data-act]').forEach((btn) => {
        btn.onclick = async () => {
          const act = btn.dataset.act;
          if (act === 'remove') {
            const ok = await confirmDialog('Remove this item from your cart?', {
              title: 'Remove item',
              confirmText: 'Remove',
              danger: true,
            });
            if (!ok) return;
            await mutate(() => apiFetch(`/cart/${id}`, { method: 'DELETE' }), 'Item removed from cart');
          } else {
            let qty = item.quantity + (act === 'inc' ? 1 : -1);
            qty = Math.max(1, Math.min(qty, max));
            await mutate(() => apiFetch(`/cart/${id}`, { method: 'PUT', body: { quantity: qty } }));
          }
        };
      });
    });
  };

  const paint = (data) => {
    const { cart, summary } = data;
    const isEmpty = !cart.items || cart.items.length === 0;

    if (isEmpty) {
      mount.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🛒</div>
          <h3>Your cart is empty</h3>
          <p>Looks like you haven't added anything yet.</p>
          <a href="${ROOT}products.html" class="btn btn-primary">Start Shopping</a>
        </div>`;
    } else {
      mount.innerHTML = cart.items.map(renderItem).join('');
      bindItemEvents(cart);
    }
    renderSummary(summary, isEmpty);
  };

  // Run a cart mutation, then repaint from the response.
  const mutate = async (fn, successMsg) => {
    try {
      const data = await fn();
      if (successMsg) toast(successMsg, 'success');
      refreshCartCount();
      paint(data);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const load = async () => {
    mount.innerHTML = '<div class="loader-wrap"><span class="loader"></span></div>';
    try {
      paint(await apiFetch('/cart'));
    } catch (err) {
      mount.innerHTML = `<div class="empty-state"><div class="empty-icon">🔌</div><h3>Could not load cart</h3><p>${escapeHtml(err.message)}</p></div>`;
    }
  };

  load();
}

document.addEventListener('DOMContentLoaded', initCartPage);

