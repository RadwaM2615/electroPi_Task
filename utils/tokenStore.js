// Per-worker Bearer token store, keyed by user ('admin', 'cashier', ...).
const tokens = new Map();

function setToken(userKey, token) {
  tokens.set(userKey, token);
}

function getToken(userKey) {
  return tokens.get(userKey) ?? null;
}

module.exports = { setToken, getToken };
