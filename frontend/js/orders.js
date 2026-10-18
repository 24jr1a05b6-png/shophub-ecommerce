/* =====================================================================
   orders.js — user orders list, order details / tracking, and dashboard
   Depends on: config.js, common.js
   ===================================================================== */

/** Render the visual order tracking component for a given status. */
function renderTracker(status) {
  const steps = ORDER_STATUSES.filter((s) => s !== 'Cancelled');
  const currentIndex = steps.indexOf(status);
  const cancelled = status === 'Cancelled';

  const stepHtml = steps
    .map((step, i) => {
      let cls = '';
      if (!cancelled && currentIndex >= 0) {
        if (i < currentIndex) cls = 'done';
        else if (i === currentIndex) cls = 'current';
      }
      const mark = cls === 'done' ? '✓' : i + 1;
      return `
        <div class="tracker-step ${cls}">
          <div class="tracker-dot">${mark}</div>
          <div class="tracker-info">
            <strong>${escapeHtml(step)}</strong>
            <span>${i === 0 ? 'Order received' : cls === 'done' ? 'Completed' : cls === 'current' ? 'In progress' : 'Pending'}</span>
          </div>
        </div>`;
    })
    .join('');

  const cancelledHtml = cancelled
    ? `<div class="tracker-step cancelled current">
         <div class="tracker-dot">✕</div>
         <div class="tracker-info"><strong>Order Cancelled</strong><span>This order has been cancelled.</span></div>
       </div>`
    : '';

  return `<div class="tracker">${stepHtml}${cancelledHtml}</div>`;
}

/* ------------------------------- Orders ------------------------------ */
async function initOrdersPage() {
  const mount = document.getElementById('ordersList');
  if (!mount) return;
  if (!requireAuth()) return;

  try {
    const { orders } = await apiFetch('/orders');
    if (!orders.length) {
      mount.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📦</div>
          <h3>No orders yet</h3>
          <p>You haven't placed any orders. Start shopping to see them here.</p>
          <a href="${ROOT}products.html" class="btn btn-primary">Start Shopping</a>
        </div>`;
      return;
    }

    mount.innerHTML = orders
      .map(
        (o) => `
      <div class="card" style="margin-bottom:18px">
        <div class="flex-between flex" style="flex-wrap:wrap;gap:12px">
          <div>
            <div style="font-weight:700;font-size:1.05rem">#${escapeHtml(o.orderId)}</div>
            <div class="text-muted" style="font-size:.85rem">${formatDateTime(o.orderDate)}</div>
          </div>
          <div>${statusBadge(o.status)}</div>
        </div>
        <div class="mt-2" style="display:flex;gap:10px;flex-wrap:wrap">
          ${o.items
            .slice(0, 4)
            .map(
              (i) =>
                `<img src="${escapeHtml(i.image)}" alt="${escapeHtml(i.name)}" title="${escapeHtml(i.name)}"
                  style="width:52px;height:52px;border-radius:8px;object-fit:cover"
                  onerror="this.src='https://via.placeholder.com/100?text=Item'" />`
            )
            .join('')}
          ${o.items.length > 4 ? `<span class="text-muted" style="align-self:center">+${o.items.length - 4} more</span>` : ''}
        </div>
        <div class="flex-between flex mt-2" style="flex-wrap:wrap;gap:12px">
          <div><span class="text-muted">${o.items.length} item(s)</span></div>
          <div style="font-weight:800;font-size:1.15rem">${formatCurrency(o.totalAmount)}</div>
          <a href="${ROOT}order-details.html?id=${o._id}" class="btn btn-light btn-sm">View Details</a>
        </div>
      </div>`
      )
      .join('');
  } catch (err) {
    mount.innerHTML = `<div class="empty-state"><div class="empty-icon">🔌</div><h3>Could not load orders</h3><p>${escapeHtml(err.message)}</p></div>`;
  }
}

/* --------------------------- Order details --------------------------- */
async function initOrderDetailsPage() {
  const mount = document.getElementById('orderDetail');
  if (!mount) return;
  if (!requireAuth()) return;

  const id = getQueryParam('id');
  if (!id) {
    mount.innerHTML = '<div class="empty-state"><div class="empty-icon">❓</div><h3>Order not found</h3></div>';
    return;
  }

  try {
    const { order: o } = await apiFetch(`/orders/${id}`);
    document.title = `Order ${o.orderId} | ShopHub`;
    const a = o.shippingAddress || {};
    const c = o.customerInfo || {};

    mount.innerHTML = `
      <div class="flex-between flex mb-3" style="flex-wrap:wrap;gap:12px">
        <div>
          <h2>Order #${escapeHtml(o.orderId)}</h2>
          <p class="text-muted">Placed on ${formatDateTime(o.orderDate)}</p>
        </div>
        <div>${statusBadge(o.status)}</div>
      </div>

      <div class="card">
        <h3 class="mb-2">Order Tracking</h3>
        ${renderTracker(o.status)}
      </div>

      <div class="card">
        <h3 class="mb-2">Items</h3>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Product</th><th>Price</th><th>Qty</th><th>Subtotal</th></tr></thead>
            <tbody>
              ${o.items
                .map(
                  (i) => `
                <tr>
                  <td style="display:flex;align-items:center;gap:12px">
                    <img class="thumb" src="${escapeHtml(i.image)}" alt=""
                      onerror="this.src='https://via.placeholder.com/100?text=Item'" />
                    ${escapeHtml(i.name)}
                  </td>
                  <td>${formatCurrency(i.price)}</td>
                  <td>${i.quantity}</td>
                  <td style="font-weight:700">${formatCurrency(i.price * i.quantity)}</td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="cart-layout mt-3">
        <div class="card">
          <h3 class="mb-2">Delivery Information</h3>
          <div class="info-grid">
            <div class="info-item"><label>Full Name</label><p>${escapeHtml(c.fullName || '—')}</p></div>
            <div class="info-item"><label>Email</label><p>${escapeHtml(c.email || '—')}</p></div>
            <div class="info-item"><label>Phone</label><p>${escapeHtml(c.phone || '—')}</p></div>
            <div class="info-item"><label>Payment</label><p>${escapeHtml(o.paymentMethod)}</p></div>
            <div class="info-item"><label>Address</label><p>${escapeHtml(a.address || '—')}</p></div>
            <div class="info-item"><label>City</label><p>${escapeHtml(a.city || '—')}, ${escapeHtml(a.state || '')}</p></div>
            <div class="info-item"><label>Pincode</label><p>${escapeHtml(a.pincode || '—')}</p></div>
            <div class="info-item"><label>Country</label><p>${escapeHtml(a.country || '—')}</p></div>
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-row"><span>Subtotal</span><span>${formatCurrency(o.subtotal)}</span></div>
          <div class="summary-row"><span>Shipping</span><span>${o.shipping === 0 ? 'FREE' : formatCurrency(o.shipping)}</span></div>
          <div class="summary-row"><span>Tax</span><span>${formatCurrency(o.tax)}</span></div>
          <div class="summary-row total"><span>Total</span><span>${formatCurrency(o.totalAmount)}</span></div>
          <a href="${ROOT}orders.html" class="btn btn-light btn-block mt-3">← Back to Orders</a>
        </div>
      </div>`;
  } catch (err) {
    mount.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><h3>Order not found</h3><p>${escapeHtml(err.message)}</p><a href="${ROOT}orders.html" class="btn btn-primary">My Orders</a></div>`;
  }
}

/* --------------------------- User dashboard -------------------------- */
async function initUserDashboard() {
  const mount = document.getElementById('userDashboard');
  if (!mount) return;
  if (!requireAuth()) return;

  const user = currentUser() || {};
  const nameEl = document.getElementById('dashName');
  if (nameEl) nameEl.textContent = (user.name || '').split(' ')[0];

  try {
    const { orders } = await apiFetch('/orders');
    const count = (s) => orders.filter((o) => o.status === s).length;
    const totalSpent = orders
      .filter((o) => o.status !== 'Cancelled')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    document.getElementById('dashStats').innerHTML = `
      <div class="stat-card"><div class="stat-icon indigo">📦</div><div><div class="stat-value">${orders.length}</div><div class="stat-label">Total Orders</div></div></div>
      <div class="stat-card"><div class="stat-icon amber">⏳</div><div><div class="stat-value">${count('Pending') + count('Confirmed') + count('Processing')}</div><div class="stat-label">Active Orders</div></div></div>
      <div class="stat-card"><div class="stat-icon green">✅</div><div><div class="stat-value">${count('Delivered')}</div><div class="stat-label">Delivered</div></div></div>
      <div class="stat-card"><div class="stat-icon violet">💳</div><div><div class="stat-value">${formatCurrency(totalSpent)}</div><div class="stat-label">Total Spent</div></div></div>`;

    const recent = document.getElementById('dashRecentOrders');
    if (!orders.length) {
      recent.innerHTML = `
        <div class="empty-state" style="box-shadow:none"><div class="empty-icon">🛍️</div>
        <h3>No orders yet</h3><p>Start shopping to see your orders here.</p>
        <a href="${ROOT}products.html" class="btn btn-primary">Browse Products</a></div>`;
    } else {
      recent.innerHTML = orders
        .slice(0, 5)
        .map(
          (o) => `
        <div class="flex-between flex" style="padding:14px 0;border-bottom:1px solid var(--gray-100);gap:10px;flex-wrap:wrap">
          <div>
            <div style="font-weight:700">#${escapeHtml(o.orderId)}</div>
            <div class="text-muted" style="font-size:.82rem">${formatDate(o.orderDate)} • ${o.items.length} item(s)</div>
          </div>
          <div>${statusBadge(o.status)}</div>
          <div style="font-weight:700">${formatCurrency(o.totalAmount)}</div>
          <a href="${ROOT}order-details.html?id=${o._id}" class="btn btn-light btn-sm">View</a>
        </div>`
        )
        .join('');
    }
  } catch (err) {
    document.getElementById('dashStats').innerHTML = `<div class="alert alert-danger">${escapeHtml(err.message)}</div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initOrdersPage();
  initOrderDetailsPage();
  initUserDashboard();
});


