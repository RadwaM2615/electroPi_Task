const base = require('@playwright/test');
const { AuthApi } = require('../apis/authApi');
const { InventoryApi } = require('../apis/inventoryApi');
const { users } = require('../config/electroPi.config');

// ─── API FIXTURE ──────────────────────────────────────────────────────────────
//
//   apiUsers  (worker) — logs admin, cashier and tenant B admin in through the
//                        API once per worker and stores their tokens.
//   apiAs     (test)   — returns an InventoryApi client for a user key. Items
//                        created through it are deleted after the test.
//
// Usage:
//   const { test, expect } = require('../../fixtures/api.fixture');
//
//   test('...', async ({ apiAs }) => {
//     const admin = await apiAs('admin');
//     const response = await admin.createItem(buildInventoryItem());
//   });

const test = base.test.extend({
  apiUsers: [
    async ({}, use) => {
      const keys = ['admin', 'cashier', 'tenantBAdmin'];
      for (const key of keys) await AuthApi.loginAndStore(key, users[key]);
      await use(keys);
    },
    { scope: 'worker' },
  ],

  apiAs: async ({ apiUsers }, use) => {
    const clients = new Map();

    await use(async (userKey = 'admin') => {
      if (!apiUsers.includes(userKey)) throw new Error(`Unknown API user "${userKey}"`);
      if (!clients.has(userKey)) clients.set(userKey, await InventoryApi.create(userKey));
      return clients.get(userKey);
    });

    for (const client of clients.values()) {
      await client.cleanup();
      await client.dispose();
    }
  },
});

module.exports = { test, expect: base.expect };
