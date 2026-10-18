/* =====================================================================
   auth.js — login, register, and profile page logic
   Depends on: config.js, common.js
   ===================================================================== */

/* -------------------------------- Login ------------------------------ */
function initLoginPage() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const email = form.email.value.trim();
    const password = form.password.value;

    document.getElementById('loginError').textContent = '';
    btn.disabled = true;
    btn.textContent = 'Logging in...';

    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: { email, password },
      });

      store.setToken(data.token);
      store.setUser(data.user);
      toast('Login successful. Welcome back!', 'success');

      const redirect = getQueryParam('redirect');
      setTimeout(() => {
        if (data.user.role === 'admin') {
          location.href = `${ROOT}admin/dashboard.html`;
        } else if (redirect) {
          location.href = `${ROOT}${redirect}`;
        } else {
          location.href = `${ROOT}index.html`;
        }
      }, 700);
    } catch (err) {
      document.getElementById('loginError').textContent = err.message;
      toast('Invalid email or password', 'error');
      btn.disabled = false;
      btn.textContent = 'Login';
    }
  });
}

/* ------------------------------ Register ----------------------------- */
function initRegisterPage() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    const confirmPassword = form.confirmPassword.value;
    const errorEl = document.getElementById('registerError');
    errorEl.textContent = '';

    if (password !== confirmPassword) {
      errorEl.textContent = 'Passwords do not match';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Creating account...';

    try {
      const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: { name, email, password, confirmPassword },
      });

      store.setToken(data.token);
      store.setUser(data.user);
      toast('Registration successful!', 'success');
      setTimeout(() => (location.href = `${ROOT}index.html`), 700);
    } catch (err) {
      errorEl.textContent = err.message;
      toast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
  });
}

/* ------------------------------- Profile ----------------------------- */
async function initProfilePage() {
  const form = document.getElementById('profileForm');
  if (!form) return;
  if (!requireAuth()) return;

  // Pre-fill the form with the latest profile from the server.
  try {
    const { user } = await apiFetch('/auth/me');
    store.setUser(user);

    form.name.value = user.name || '';
    form.email.value = user.email || '';
    form.phone.value = user.phone || '';
    const addr = user.address || {};
    form.street.value = addr.street || '';
    form.city.value = addr.city || '';
    form.state.value = addr.state || '';
    form.pincode.value = addr.pincode || '';
    form.country.value = addr.country || '';

    document.getElementById('profileRole').innerHTML =
      user.role === 'admin'
        ? '<span class="badge badge-admin">Administrator</span>'
        : '<span class="badge badge-user">Customer</span>';
    document.getElementById('profileJoined').textContent = formatDate(user.createdAt);
  } catch (err) {
    toast(err.message, 'error');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      const payload = {
        name: form.name.value.trim(),
        phone: form.phone.value.trim(),
        address: {
          street: form.street.value.trim(),
          city: form.city.value.trim(),
          state: form.state.value.trim(),
          pincode: form.pincode.value.trim(),
          country: form.country.value.trim(),
        },
      };
      if (form.password.value) payload.password = form.password.value;

      const { user } = await apiFetch('/auth/me', { method: 'PUT', body: payload });
      store.setUser(user);
      toast('Profile updated successfully', 'success');
      form.password.value = '';
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Changes';
    }
  });
}

/* ---------------------------- Logout button -------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  initLoginPage();
  initRegisterPage();
  initProfilePage();
});
