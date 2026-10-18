/* =====================================================================
   admin.js — admin dashboard, products, orders, and users management
   Depends on: config.js, common.js
   Every admin page calls initAdminPage('<key>') from its own script tag.
   ===================================================================== */

/** Render the admin sidebar, highlighting the active page. */
function renderAdminSidebar(active) {
  const mount = document.getElementById('adminSidebar');
  if (!mount) return;

  const link = (href, icon, label, key) =>
    `<a href="${href}" class="${active === key ? 'active' : ''}">${icon} ${label}</a>`;

  mount.innerHTML = `
    <h3>Admin Panel</h3>
    ${link(`${ROOT}admin/dashboard.html`, '📊', 'Dashboard', 'dashboard')}
    <h3>Catalog</h3>
    ${link(`${ROOT}admin/products.html`, '📦', 'Manage Products', 'products')}
    ${link(`${ROOT}admin/add-product.html`, '➕', 'Add Product', 'add-product')}
    <h3>Sales</h3>
    ${link(`${ROOT}admin/orders.html`, '🧾', 'Manage Orders', 'orders')}
    <h3>People</h3>
    ${link(`${ROOT}admin/users.html`, '👥', 'Manage Users', 'users')}
    <h3>Store</h3>
    ${link(`${ROOT}index.html`, '🏬', 'View Storefront', '')}`;
}

/** Guard + sidebar for every admin page. Returns true when access is allowed. */
function initAdminPage(active) {
  if (!requireAdmin()) return false;
  renderAdminSidebar(active);
  return true;
}

/* ============================ DASHBOARD ============================== */
async function initAdminDashboard() {
  if (!initAdminPage('dashboard')) return;

  try {
    const { stats, charts, recentOrders } = await apiFetch('/orders/stats');

    document.getElementById('adminStats').innerHTML = `
      <div class="stat-card"><div class="stat-icon indigo">📦</div><div><div class="stat-value">${stats.totalProducts}</div><div class="stat-label">Total Products</div></div></div>
      <div class="stat-card"><div class="stat-icon blue">👥</div><div><div class="stat-value">${stats.totalUsers}</div><div class="stat-label">Total Users</div></div></div>
      <div class="stat-card"><div class="stat-icon violet">🧾</div><div><div class="stat-value">${stats.totalOrders}</div><div class="stat-label">Total Orders</div></div></div>
      <div class="stat-card"><div class="stat-icon amber">⏳</div><div><div class="stat-value">${stats.pendingOrders}</div><div class="stat-label">Pending Orders</div></div></div>
      <div class="stat-card"><div class="stat-icon green">✅</div><div><div class="stat-value">${stats.completedOrders}</div><div class="stat-label">Completed Orders</div></div></div>
      <div class="stat-card"><div class="stat-icon green">💰</div><div><div class="stat-value">${formatCurrency(stats.totalSales)}</div><div class="stat-label">Total Sales</div></div></div>`;

    renderMonthlyRevenue(charts.monthlyRevenue);
    renderCategoryChart(charts.productsByCategory);
    renderRecentOrders(recentOrders);
  } catch (err) {
    document.getElementById('adminStats').innerHTML = `<div class="alert alert-danger">${escapeHtml(err.message)}</div>`;
  }
}

/** Simple CSS bar chart for monthly revenue. */
function renderMonthlyRevenue(rows) {
  const el = document.getElementById('revenueChart');
  if (!el) return;
  if (!rows.length) {
    el.innerHTML = '<p class="text-muted">No sales data yet.</p>';
    return;
  }
  const max = Math.max(...rows.map((r) => r.revenue), 1);
  el.innerHTML = `
    <div class="bar-chart">
      ${rows
        .map(
          (r) => `
        <div class="bar-col">
          <span class="bar-value">${formatCurrency(r.revenue)}</span>
          <div class="bar" style="height:${Math.max(4, (r.revenue / max) * 100)}%" title="${r.orders} orders"></div>
          <span class="bar-label">${escapeHtml(r.label)}</span>
        </div>`
        )
        .join('')}
    </div>`;
}

/** Category breakdown as labelled bars with an emoji palette. */
function renderCategoryChart(rows) {
  const el = document.getElementById('categoryChart');
  if (!el) return;
  if (!rows.length) {
    el.innerHTML = '<p class="text-muted">No product data yet.</p>';
    return;
  }
  const palette = ['#4f46e5', '#0ea5e9', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed'];
  const max = Math.max(...rows.map((r) => r.count), 1);
  el.innerHTML = rows
    .map((r, i) => {
      const color = palette[i % palette.length];
      return `
        <div style="margin-bottom:14px">
          <div class="flex-between" style="font-size:.85rem;margin-bottom:5px">
            <span>${escapeHtml(r.category)}</span><strong>${r.count}</strong>
          </div>
          <div style="height:9px;background:var(--gray-100);border-radius:9px;overflow:hidden">
            <div style="height:100%;width:${(r.count / max) * 100}%;background:${color};border-radius:9px"></div>
          </div>
        </div>`;
    })
    .join('');
}

function renderRecentOrders(orders) {
  const el = document.getElementById('recentOrders');
  if (!el) return;
  if (!orders.length) {
    el.innerHTML = '<p class="text-muted" style="padding:16px">No orders yet.</p>';
    return;
  }
  el.innerHTML = `
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th></tr></thead>
        <tbody>
          ${orders
            .map(
              (o) => `
            <tr>
              <td><strong>#${escapeHtml(o.orderId)}</strong></td>
              <td>${escapeHtml(o.user?.name || o.customerInfo?.fullName || '—')}</td>
              <td>${formatDate(o.orderDate)}</td>
              <td>${formatCurrency(o.totalAmount)}</td>
              <td>${statusBadge(o.status)}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>`;
}

/* ============================= PRODUCTS ============================== */
async function initAdminProducts() {
  if (!initAdminPage('products')) return;

  const tbody = document.getElementById('productsTableBody');
  const searchInput = document.getElementById('adminProductSearch');

  const load = async () => {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center"><span class="loader"></span></td></tr>';
    try {
      const { products } = await apiFetch('/products?limit=1000');
      const term = (searchInput?.value || '').toLowerCase();
      const list = products.filter(
        (p) => !term || p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term)
      );

      if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding:40px">No products found.</td></tr>';
        return;
      }

      tbody.innerHTML = list
        .map(
          (p) => `
        <tr data-id="${p._id}">
          <td style="display:flex;align-items:center;gap:12px">
            <img class="thumb" src="${escapeHtml(p.image)}" alt=""
              onerror="this.src='https://via.placeholder.com/100?text=P'" />
            <div>
              <div style="font-weight:600">${escapeHtml(p.name)}</div>
              <div class="text-muted" style="font-size:.78rem">${escapeHtml(p.category)}</div>
            </div>
          </td>
          <td>${formatCurrency(p.price)}</td>
          <td><input type="number" min="0" value="${p.stock}" class="form-control stock-input" style="width:90px;padding:6px 10px" /></td>
          <td>${starRating(p.rating)}</td>
          <td>${p.featured ? '<span class="badge badge-admin">Featured</span>' : '<span class="badge badge-user">Standard</span>'}</td>
          <td>
            <div class="actions">
              <button class="btn btn-light btn-sm" data-act="save">💾 Save</button>
              <a href="${ROOT}admin/add-product.html?id=${p._id}" class="btn btn-light btn-sm">✏️ Edit</a>
              <button class="btn btn-danger btn-sm" data-act="delete">🗑</button>
            </div>
          </td>
        </tr>`
        )
        .join('');

      tbody.querySelectorAll('tr[data-id]').forEach((row) => {
        const id = row.dataset.id;

        row.querySelector('[data-act="save"]').onclick = async () => {
          const stock = Number(row.querySelector('.stock-input').value);
          try {
            await apiFetch(`/products/${id}`, { method: 'PUT', body: { stock } });
            toast('Product updated successfully', 'success');
          } catch (err) {
            toast(err.message, 'error');
          }
        };

        row.querySelector('[data-act="delete"]').onclick = async () => {
          const ok = await confirmDialog('Delete this product permanently?', {
            title: 'Delete product',
            confirmText: 'Delete',
            danger: true,
          });
          if (!ok) return;
          try {
            await apiFetch(`/products/${id}`, { method: 'DELETE' });
            toast('Product deleted successfully', 'success');
            load();
          } catch (err) {
            toast(err.message, 'error');
          }
        };
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger" style="padding:30px">${escapeHtml(err.message)}</td></tr>`;
    }
  };

  if (searchInput) {
    let t;
    searchInput.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(load, 300);
    });
  }

  load();
}

/* =========================== ADD / EDIT PRODUCT ====================== */
async function initAdminProductForm() {
  const form = document.getElementById('productForm');
  if (!form) return;

  const editId = getQueryParam('id');
  if (!initAdminPage(editId ? 'products' : 'add-product')) return;

  form.category.innerHTML =
    '<option value="">Select a category</option>' +
    CATEGORIES.map((c) => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');

  if (editId) {
    document.getElementById('formTitle').textContent = 'Edit Product';
    document.getElementById('formSubtitle').textContent = 'Update the product details below.';
    try {
      const { product: p } = await apiFetch(`/products/${editId}`);
      form.name.value = p.name;
      form.description.value = p.description;
      form.price.value = p.price;
      form.category.value = p.category;
      form.image.value = p.image;
      form.stock.value = p.stock;
      form.rating.value = p.rating;
      form.featured.checked = p.featured;
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;

    const payload = {
      name: form.name.value.trim(),
      description: form.description.value.trim(),
      price: Number(form.price.value),
      category: form.category.value,
      image: form.image.value.trim() || 'https://via.placeholder.com/600x450?text=Product',
      stock: Number(form.stock.value),
      rating: Number(form.rating.value),
      featured: form.featured.checked,
    };

    try {
      if (editId) {
        await apiFetch(`/products/${editId}`, { method: 'PUT', body: payload });
        toast('Product updated successfully', 'success');
      } else {
        await apiFetch('/products', { method: 'POST', body: payload });
        toast('Product created successfully', 'success');
      }
      setTimeout(() => (location.href = `${ROOT}admin/products.html`), 700);
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false;
    }
  });
}

/* ============================== ORDERS =============================== */
async function initAdminOrders() {
  if (!initAdminPage('orders')) return;

  const tbody = document.getElementById('ordersTableBody');
  const statusFilter = document.getElementById('orderStatusFilter');
  const searchInput = document.getElementById('orderSearch');

  const load = async () => {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center"><span class="loader"></span></td></tr>';
    const params = new URLSearchParams({
      status: statusFilter?.value || '',
      q: searchInput?.value || '',
    });

    try {
      const { orders } = await apiFetch(`/orders/all?${params.toString()}`);
      if (!orders.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding:40px">No orders found.</td></tr>';
        return;
      }

      tbody.innerHTML = orders
        .map(
          (o) => `
        <tr data-id="${o._id}">
          <td><strong>#${escapeHtml(o.orderId)}</strong></td>
          <td>
            <div>${escapeHtml(o.customerInfo?.fullName || o.user?.name || '—')}</div>
            <div class="text-muted" style="font-size:.78rem">${escapeHtml(o.customerInfo?.email || o.user?.email || '')}</div>
          </td>
          <td>${formatDate(o.orderDate)}</td>
          <td>${formatCurrency(o.totalAmount)}</td>
          <td>${escapeHtml(o.paymentMethod)}</td>
          <td>
            <select class="form-control status-select" style="min-width:150px;padding:6px 10px">
              ${ORDER_STATUSES.map(
                (s) => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`
              ).join('')}
            </select>
          </td>
          <td><a href="${ROOT}order-details.html?id=${o._id}" class="btn btn-light btn-sm">View</a></td>
        </tr>`
        )
        .join('');

      tbody.querySelectorAll('tr[data-id]').forEach((row) => {
        const id = row.dataset.id;
        row.querySelector('.status-select').onchange = async (e) => {
          const status = e.target.value;
          try {
            await apiFetch(`/orders/${id}/status`, { method: 'PUT', body: { status } });
            toast('Order status updated successfully', 'success');
          } catch (err) {
            toast(err.message, 'error');
          }
        };
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger" style="padding:30px">${escapeHtml(err.message)}</td></tr>`;
    }
  };

  if (statusFilter) statusFilter.onchange = load;
  if (searchInput) {
    let t;
    searchInput.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(load, 300);
    });
  }

  load();
}

/* =============================== USERS =============================== */
async function initAdminUsers() {
  if (!initAdminPage('users')) return;

  const tbody = document.getElementById('usersTableBody');

  const load = async () => {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center"><span class="loader"></span></td></tr>';
    try {
      const { users } = await apiFetch('/users');
      if (!users.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding:40px">No users found.</td></tr>';
        return;
      }

      tbody.innerHTML = users
        .map(
          (u) => `
        <tr data-id="${u._id}">
          <td style="display:flex;align-items:center;gap:12px">
            <span class="nav-avatar">${escapeHtml((u.name || 'U').charAt(0).toUpperCase())}</span>
            <span style="font-weight:600">${escapeHtml(u.name)}</span>
          </td>
          <td>${escapeHtml(u.email)}</td>
          <td>${escapeHtml(u.phone || '—')}</td>
          <td>
            <select class="form-control role-select" style="width:120px;padding:6px 10px" ${u.role === 'admin' ? 'disabled' : ''}>
              <option value="user" ${u.role === 'user' ? 'selected' : ''}>user</option>
              <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>admin</option>
            </select>
          </td>
          <td>${formatDate(u.createdAt)}</td>
          <td>
            <button class="btn btn-danger btn-sm" data-act="delete" ${u.role === 'admin' ? 'disabled' : ''}>🗑 Delete</button>
          </td>
        </tr>`
        )
        .join('');

      tbody.querySelectorAll('tr[data-id]').forEach((row) => {
        const id = row.dataset.id;

        row.querySelector('.role-select').onchange = async (e) => {
          try {
            await apiFetch(`/users/${id}`, { method: 'PUT', body: { role: e.target.value } });
            toast('User updated successfully', 'success');
          } catch (err) {
            toast(err.message, 'error');
          }
        };

        row.querySelector('[data-act="delete"]').onclick = async () => {
          const ok = await confirmDialog('Delete this user and all their orders?', {
            title: 'Delete user',
            confirmText: 'Delete',
            danger: true,
          });
          if (!ok) return;
          try {
            await apiFetch(`/users/${id}`, { method: 'DELETE' });
            toast('User deleted successfully', 'success');
            load();
          } catch (err) {
            toast(err.message, 'error');
          }
        };
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger" style="padding:30px">${escapeHtml(err.message)}</td></tr>`;
    }
  };

  load();
}

/* ------------------------------ Bootstrap ---------------------------- */
// Each admin page includes admin.js and calls the matching init function
// from an inline script, e.g. initAdminDashboard().



