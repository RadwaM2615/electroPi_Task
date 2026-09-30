// @ts-check
const usersData = require('../data/users.json');
const categories = require('../data/categories.json');

// ─── Electro Pi environment config ────────────────────────────────────────────
// Base URLs and users for the Electro Pi specs. Users and categories come from
// the JSON files in data/; every credential can be overridden with an
// environment variable (CI secrets in the pipeline), so the JSON only holds the
// demo users of the local mock app.

const port = process.env.MOCK_PORT || '3100';
const baseURL = process.env.ELECTROPI_BASE_URL || `http://localhost:${port}`;

/**
 * @param {{ email: string, password: string }} fallback
 * @param {string} prefix env var prefix, e.g. 'ADMIN' → ADMIN_EMAIL / ADMIN_PASSWORD
 */
function withEnvOverride(fallback, prefix) {
  return {
    email: process.env[`${prefix}_EMAIL`] || fallback.email,
    password: process.env[`${prefix}_PASSWORD`] || fallback.password,
  };
}

const users = {
  admin: withEnvOverride(usersData.admin, 'ADMIN'),
  cashier: withEnvOverride(usersData.cashier, 'CASHIER'),
  tenantBAdmin: withEnvOverride(usersData.tenantBAdmin, 'TENANT_B_ADMIN'),
};

module.exports = { port, baseURL, apiBaseURL: baseURL, users, categories };
