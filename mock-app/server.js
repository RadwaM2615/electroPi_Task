// ─────────────────────────────────────────────────────────────────────────────
// ELECTRO PI MOCK APP
//
// A tiny multi-tenant POS / inventory app used as the system under test for the
// Electro Pi assessment specs and the CI pipeline.
// Plain Node (no dependencies) so it starts anywhere, including CI runners.
//
//   node mock-app/server.js            → http://localhost:3100
//   MOCK_PORT=4000 MOCK_LATENCY_MS=0 node mock-app/server.js
//
// UI:   /login → /dashboard → /inventory
// API:  POST   /api/v1/auth/login
//       GET    /api/v1/categories
//       GET    /api/v1/inventory/items
//       POST   /api/v1/inventory/items
//       GET    /api/v1/inventory/items/:id
//       DELETE /api/v1/inventory/items/:id
//       GET    /health
//
// All data lives in memory and resets on restart. The seeded users below are
// demo-only credentials for this mock; real environments read credentials
// from environment variables / CI secrets (see config/electroPi.config.js).
// ─────────────────────────────────────────────────────────────────────────────

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.MOCK_PORT || 3100);
// Artificial API latency so tests prove they sync on real conditions, not timing
const LATENCY_MS = Number(process.env.MOCK_LATENCY_MS ?? 300);
const TOKEN_TTL_SECONDS = Number(process.env.MOCK_TOKEN_TTL_SECONDS || 3600);
const MAX_ITEM_NAME_LENGTH = 100;

// ─── Seed data ────────────────────────────────────────────────────────────────

const users = [
  { email: 'admin@tenant-a.test', password: 'Admin#123', role: 'admin', tenantId: 'tenant-a' },
  { email: 'cashier@tenant-a.test', password: 'Cashier#123', role: 'cashier', tenantId: 'tenant-a' },
  { email: 'admin@tenant-b.test', password: 'Admin#123', role: 'admin', tenantId: 'tenant-b' },
];

const categories = [
  { id: 1, name: 'Groceries', tenantId: 'tenant-a' },
  { id: 2, name: 'Clothing', tenantId: 'tenant-a' },
  { id: 3, name: 'Electronics', tenantId: 'tenant-a' },
  { id: 4, name: 'Electronics', tenantId: 'tenant-b' },
  { id: 5, name: 'Beverages', tenantId: 'tenant-b' },
];

/** @type {Map<number, any>} */
const items = new Map();
let nextItemId = 1;

/** @type {Map<string, { user: any, expiresAt: number }>} */
const sessions = new Map();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(body === undefined ? '' : JSON.stringify(body));
}

function sendFile(res, fileName, contentType = 'text/html; charset=utf-8') {
  const filePath = path.join(__dirname, 'public', fileName);
  fs.readFile(filePath, (err, content) => {
    if (err) return sendJson(res, 404, { error: 'Not found' });
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

/** Returns the session for a valid Bearer token, or null. */
function authenticate(req) {
  const header = req.headers['authorization'] || '';
  if (!header.startsWith('Bearer ')) return null;
  const session = sessions.get(header.slice(7));
  if (!session) return null;
  if (Date.now() >= session.expiresAt) {
    sessions.delete(header.slice(7));
    return null;
  }
  return session;
}

function publicItem(item) {
  const { tenantId, ...rest } = item;
  return { ...rest, tenant_id: tenantId };
}

/** Field-level validation for POST /api/v1/inventory/items. */
function validateItem(payload, tenantId) {
  const errors = {};
  const { item_name, sku, quantity, price, category_id } = payload;

  if (typeof item_name !== 'string' || item_name.trim() === '') {
    errors.item_name = 'item_name is required and must be a non-empty string';
  } else if (item_name.length > MAX_ITEM_NAME_LENGTH) {
    errors.item_name = `item_name must be at most ${MAX_ITEM_NAME_LENGTH} characters`;
  }

  if (typeof sku !== 'string' || sku.trim() === '') {
    errors.sku = 'sku is required and must be a non-empty string';
  }

  if (!Number.isInteger(quantity) || quantity < 0) {
    errors.quantity = 'quantity must be an integer greater than or equal to 0';
  }

  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
    errors.price = 'price must be a number greater than 0';
  } else if (Math.round(price * 100) / 100 !== price) {
    errors.price = 'price must have at most 2 decimal places';
  }

  // Unknown categories and categories owned by another tenant get the same
  // answer, so the API never reveals that another tenant's category exists.
  const categoryInTenant = categories.some(c => c.id === category_id && c.tenantId === tenantId);
  if (!Number.isInteger(category_id) || !categoryInTenant) {
    errors.category_id = 'category_id does not exist';
  }

  return errors;
}

// ─── API handlers ─────────────────────────────────────────────────────────────

async function handleLogin(req, res) {
  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    return sendJson(res, 400, { error: 'Malformed JSON body' });
  }

  const user = users.find(u => u.email === payload.email && u.password === payload.password);
  if (!user) return sendJson(res, 401, { error: 'Invalid email or password' });

  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, { user, expiresAt: Date.now() + TOKEN_TTL_SECONDS * 1000 });

  return sendJson(res, 200, {
    access_token: token,
    token_type: 'Bearer',
    expires_in: TOKEN_TTL_SECONDS,
    user: { email: user.email, role: user.role, tenant_id: user.tenantId },
  });
}

async function handleCreateItem(req, res, session) {
  if (session.user.role !== 'admin') {
    return sendJson(res, 403, { error: 'Only Store Admins can add inventory items' });
  }

  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    return sendJson(res, 400, { error: 'Malformed JSON body' });
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return sendJson(res, 400, { error: 'Request body must be a JSON object' });
  }

  const tenantId = session.user.tenantId;
  const errors = validateItem(payload, tenantId);
  if (Object.keys(errors).length > 0) {
    return sendJson(res, 422, { error: 'Validation failed', errors });
  }

  // SKU uniqueness is scoped per tenant
  const duplicate = [...items.values()].some(i => i.tenantId === tenantId && i.sku === payload.sku);
  if (duplicate) {
    return sendJson(res, 409, { error: `An item with SKU "${payload.sku}" already exists`, sku: payload.sku });
  }

  const item = {
    id: nextItemId++,
    item_name: payload.item_name,
    sku: payload.sku,
    quantity: payload.quantity,
    price: payload.price,
    category_id: payload.category_id,
    tenantId,
    created_at: new Date().toISOString(),
  };
  items.set(item.id, item);
  return sendJson(res, 201, publicItem(item));
}

async function handleApi(req, res, url) {
  await delay(LATENCY_MS);

  if (req.method === 'POST' && url.pathname === '/api/v1/auth/login') {
    return handleLogin(req, res);
  }

  const session = authenticate(req);
  if (!session) return sendJson(res, 401, { error: 'Missing, malformed or expired Bearer token' });
  const tenantId = session.user.tenantId;

  if (req.method === 'GET' && url.pathname === '/api/v1/categories') {
    return sendJson(res, 200, categories
      .filter(c => c.tenantId === tenantId)
      .map(({ id, name }) => ({ id, name })));
  }

  if (url.pathname === '/api/v1/inventory/items') {
    if (req.method === 'POST') return handleCreateItem(req, res, session);
    if (req.method === 'GET') {
      return sendJson(res, 200, [...items.values()]
        .filter(i => i.tenantId === tenantId)
        .map(publicItem));
    }
  }

  const itemMatch = url.pathname.match(/^\/api\/v1\/inventory\/items\/(\d+)$/);
  if (itemMatch) {
    const item = items.get(Number(itemMatch[1]));
    // Items of another tenant are reported as missing, never as forbidden
    if (!item || item.tenantId !== tenantId) return sendJson(res, 404, { error: 'Item not found' });

    if (req.method === 'GET') return sendJson(res, 200, publicItem(item));
    if (req.method === 'DELETE') {
      if (session.user.role !== 'admin') return sendJson(res, 403, { error: 'Only Store Admins can delete items' });
      items.delete(item.id);
      return sendJson(res, 204);
    }
  }

  return sendJson(res, 404, { error: 'Not found' });
}

// ─── Server ───────────────────────────────────────────────────────────────────

const pages = {
  '/': 'login.html',
  '/login': 'login.html',
  '/dashboard': 'dashboard.html',
  '/inventory': 'inventory.html',
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  try {
    if (url.pathname === '/health') return sendJson(res, 200, { status: 'ok' });
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    if (url.pathname === '/app.js') return sendFile(res, 'app.js', 'text/javascript; charset=utf-8');
    if (url.pathname === '/styles.css') return sendFile(res, 'styles.css', 'text/css; charset=utf-8');
    if (pages[url.pathname]) return sendFile(res, pages[url.pathname]);
    return sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: 'Internal server error' });
  }
});

server.listen(PORT, () => {
  console.log(`Electro Pi mock app running on http://localhost:${PORT} (API latency ${LATENCY_MS}ms)`);
});
