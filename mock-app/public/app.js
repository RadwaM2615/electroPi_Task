// Shared browser helpers for the Electro Pi mock app pages.

const TOKEN_KEY = 'electropi.token';
const USER_KEY = 'electropi.user';

const session = {
  get token() { return localStorage.getItem(TOKEN_KEY); },
  get user() { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); },
  save(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

/** Redirects to /login when there is no stored session. */
function requireAuth() {
  if (!session.token) {
    window.location.replace('/login');
    return false;
  }
  const user = session.user;
  const userLabel = document.querySelector('[data-testid="current-user"]');
  if (userLabel && user) userLabel.textContent = `${user.email} · ${user.tenant_id}`;
  document.querySelector('[data-testid="logout"]')?.addEventListener('click', () => {
    session.clear();
    window.location.assign('/login');
  });
  return true;
}

/** fetch wrapper that adds the Bearer token and handles expired sessions. */
async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(session.token ? { Authorization: `Bearer ${session.token}` } : {}),
      ...options.headers,
    },
  });
  if (response.status === 401 && path !== '/api/v1/auth/login') {
    session.clear();
    window.location.replace('/login');
  }
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

/** Shows a toast in the shared toast region. */
function showToast(message, type = 'success') {
  const region = document.querySelector('[data-testid="toast-region"]');
  const toast = document.createElement('div');
  toast.setAttribute('role', 'alert');
  toast.dataset.testid = 'toast';
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  region.replaceChildren(toast);
  setTimeout(() => toast.remove(), 5000);
}
