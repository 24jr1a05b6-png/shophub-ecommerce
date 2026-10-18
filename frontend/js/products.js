/* =====================================================================
   products.js — home, product catalog, and product details pages
   Depends on: config.js, common.js
   ===================================================================== */

/** Build the HTML for a single product card. */
function productCard(p) {
  const outOfStock = p.stock <= 0;
  return `
    <article class="product-card">
      <div class="product-media">
        <a href="${ROOT}product-details.html?id=${p._id}">
          <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}"
               onerror="this.src='https://via.placeholder.com/600x450?text=Product'" />
        </a>
        ${outOfStock ? '<span class="product-badge">Out of Stock</span>' : p.featured ? '<span class="product-badge new">Featured</span>' : ''}
      </div>
      <div class="product-body">
        <div class="product-category">${escapeHtml(p.category)}</div>
        <h3 class="product-name">
          <a href="${ROOT}product-details.html?id=${p._id}">${escapeHtml(p.name)}</a>
        </h3>
        <div class="product-rating">${starRating(p.rating)} <span>(${Number(p.rating || 0).toFixed(1)})</span></div>
        ${stockBadge(p.stock)}
        <div class="product-footer">
          <span class="product-price">${formatCurrency(p.price)}</span>
        </div>
        <div class="product-actions">
          <a href="${ROOT}product-details.html?id=${p._id}" class="btn btn-light btn-sm">View Details</a>
          <button class="btn btn-primary btn-sm" ${outOfStock ? 'disabled' : ''}
                  onclick="addToCart('${p._id}')">${outOfStock ? 'Out of Stock' : 'Add to Cart'}</button>
        </div>
      </div>
    </article>`;
}

/** Render a list of products into a container, or an empty state. */
function renderProducts(container, products) {
  if (!products.length) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🔍</div>
        <h3>No products found</h3>
        <p>Try adjusting your search or filters.</p>
      </div>`;
    return;
  }
  container.innerHTML = products.map(productCard).join('');
}

function renderCategories(container, onSelect) {
  if (!container) return;
  container.innerHTML = CATEGORIES.map(
    (c) => `
      <div class="category-card" data-category="${escapeHtml(c.name)}">
        <div class="category-icon">${c.icon}</div>
        <h3>${escapeHtml(c.name)}</h3>
        <p>Shop now</p>
      </div>`
  ).join('');
  if (onSelect) {
    container.querySelectorAll('.category-card').forEach((card) => {
      card.onclick = () => onSelect(card.dataset.category);
    });
  }
}

/* -------------------------------- Home ------------------------------- */
async function initHomePage() {
  const featuredEl = document.getElementById('featuredProducts');
  if (!featuredEl) return;

  // Categories
  const catEl = document.getElementById('categoryList');
  renderCategories(catEl, (cat) => (location.href = `${ROOT}products.html?category=${encodeURIComponent(cat)}`));

  // Featured products
  try {
    const { products } = await apiFetch('/products?featured=true&limit=8');
    renderProducts(featuredEl, products);
  } catch (err) {
    featuredEl.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔌</div><h3>Could not load products</h3><p>${escapeHtml(err.message)}</p></div>`;
  }

  // Live product count in the hero
  try {
    const { total } = await apiFetch('/products?limit=1');
    const stat = document.getElementById('statProducts');
    if (stat) stat.textContent = `${total}+`;
  } catch { /* ignore */ }
}

/* ------------------------------ Catalog ------------------------------ */
async function initProductsPage() {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  const catSelect = document.getElementById('filterCategory');
  if (catSelect) {
    catSelect.innerHTML =
      '<option value="">All Categories</option>' +
      CATEGORIES.map((c) => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');
  }

  const state = {
    search: getQueryParam('search') || '',
    category: getQueryParam('category') || '',
    minPrice: '',
    maxPrice: '',
    sort: 'newest',
    page: 1,
    limit: 9,
  };

  const searchInput = document.getElementById('filterSearch');
  if (searchInput && state.search) searchInput.value = state.search;
  if (catSelect && state.category) catSelect.value = state.category;

  const renderPagination = (page, pages) => {
    const el = document.getElementById('pagination');
    if (!el) return;
    if (pages <= 1) { el.innerHTML = ''; return; }
    let html = `<button ${page === 1 ? 'disabled' : ''} data-page="${page - 1}">‹ Prev</button>`;
    for (let i = 1; i <= pages; i++) {
      html += `<button class="${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    html += `<button ${page === pages ? 'disabled' : ''} data-page="${page + 1}">Next ›</button>`;
    el.innerHTML = html;
    el.querySelectorAll('button[data-page]').forEach((b) => {
      b.onclick = () => {
        state.page = Number(b.dataset.page);
        load();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };
    });
  };

  const load = async () => {
    grid.innerHTML = '<div class="loader-wrap" style="grid-column:1/-1"><span class="loader"></span></div>';
    const params = new URLSearchParams({
      search: state.search,
      category: state.category,
      minPrice: state.minPrice,
      maxPrice: state.maxPrice,
      sort: state.sort,
      page: state.page,
      limit: state.limit,
    });

    try {
      const data = await apiFetch(`/products?${params.toString()}`);
      renderProducts(grid, data.products);
      const countEl = document.getElementById('resultCount');
      if (countEl) countEl.textContent = `${data.total} product${data.total === 1 ? '' : 's'} found`;
      renderPagination(data.page, data.pages);
    } catch (err) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔌</div><h3>Error</h3><p>${escapeHtml(err.message)}</p></div>`;
    }
  };

  const filterForm = document.getElementById('filterForm');
  if (filterForm) {
    filterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      state.search = searchInput.value.trim();
      state.category = catSelect.value;
      state.minPrice = document.getElementById('filterMin').value;
      state.maxPrice = document.getElementById('filterMax').value;
      state.sort = document.getElementById('filterSort').value;
      state.page = 1;
      load();
    });
    filterForm.addEventListener('reset', (e) => {
      e.preventDefault();
      filterForm.reset();
      state.search = state.category = state.minPrice = state.maxPrice = '';
      state.sort = 'newest';
      state.page = 1;
      load();
    });
  }

  load();
}

/* --------------------------- Product details ------------------------- */
async function initProductDetailsPage() {
  const mount = document.getElementById('productDetail');
  if (!mount) return;

  const id = getQueryParam('id');
  if (!id) {
    mount.innerHTML = '<div class="empty-state"><div class="empty-icon">❓</div><h3>Product not found</h3></div>';
    return;
  }

  try {
    const { product: p } = await apiFetch(`/products/${id}`);
    const outOfStock = p.stock <= 0;
    document.title = `${p.name} | ShopHub`;

    mount.innerHTML = `
      <div class="gallery">
        <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}"
             onerror="this.src='https://via.placeholder.com/600x450?text=Product'" />
      </div>
      <div>
        <div class="product-category">${escapeHtml(p.category)}</div>
        <h1>${escapeHtml(p.name)}</h1>
        <div class="product-rating">${starRating(p.rating)} <span>(${Number(p.rating || 0).toFixed(1)} / 5)</span></div>
        <div class="detail-price">${formatCurrency(p.price)}</div>
        ${stockBadge(p.stock)}
        <p class="mt-2" style="color:var(--gray-600)">${escapeHtml(p.description)}</p>

        <div class="detail-meta">
          <div class="info-item"><label>Category</label><p>${escapeHtml(p.category)}</p></div>
          <div class="info-item"><label>Availability</label><p>${p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}</p></div>
        </div>

        ${
          outOfStock
            ? '<div class="alert alert-danger">⚠ This product is currently out of stock.</div>'
            : `
          <div class="flex gap-2" style="align-items:center;margin:20px 0;flex-wrap:wrap">
            <div class="qty-input">
              <button type="button" id="qtyMinus">−</button>
              <input type="number" id="qtyValue" value="1" min="1" max="${p.stock}" readonly />
              <button type="button" id="qtyPlus">+</button>
            </div>
            <button class="btn btn-outline" id="addBtn">🛒 Add to Cart</button>
            <button class="btn btn-primary" id="buyBtn">⚡ Buy Now</button>
          </div>`
        }

        <div class="alert alert-info mt-2">🔒 Secure checkout • Cash on Delivery available • Easy returns</div>
      </div>`;

    if (!outOfStock) {
      const qtyInput = document.getElementById('qtyValue');
      document.getElementById('qtyMinus').onclick = () => {
        qtyInput.value = Math.max(1, Number(qtyInput.value) - 1);
      };
      document.getElementById('qtyPlus').onclick = () => {
        qtyInput.value = Math.min(p.stock, Number(qtyInput.value) + 1);
      };
      document.getElementById('addBtn').onclick = () => addToCart(p._id, Number(qtyInput.value));
      document.getElementById('buyBtn').onclick = () =>
        addToCart(p._id, Number(qtyInput.value), { goToCart: true });
    }
  } catch (err) {
    mount.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><h3>Product not found</h3><p>${escapeHtml(err.message)}</p><a href="${ROOT}products.html" class="btn btn-primary">Browse Products</a></div>`;
  }
}

/* ------------------------------ Bootstrap ---------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  initHomePage();
  initProductsPage();
  initProductDetailsPage();
});


