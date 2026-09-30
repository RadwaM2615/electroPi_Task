// @ts-check
const crypto = require('crypto');
const { validItem } = require('../inventoryItems.json');

// ─── Product test data factory ────────────────────────────────────────────────
// Builds payloads from the JSON test data and adds a unique suffix to names and
// SKUs, so parallel workers, shards and re-runs never collide on the per-tenant
// SKU uniqueness rule.

/** Short unique suffix: timestamp + random bytes (safe across parallel workers). */
function uniqueSuffix() {
  return `${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`.toUpperCase();
}

/**
 * @typedef {object} InventoryItemPayload
 * @property {string} item_name
 * @property {string} sku
 * @property {number} quantity
 * @property {number} price
 * @property {number} category_id
 */

/**
 * Valid POST /api/v1/inventory/items payload (data/inventoryItems.json → validItem).
 * Override any field as needed.
 * @param {Partial<InventoryItemPayload> & Record<string, unknown>} [overrides]
 * @returns {InventoryItemPayload}
 */
function buildInventoryItem(overrides = {}) {
  const { skuPrefix, ...fields } = validItem;
  return {
    ...fields,
    sku: `${skuPrefix}-${uniqueSuffix()}`,
    ...overrides,
  };
}

/**
 * Unique product name for UI tests.
 * @param {string} base
 */
function uniqueProductName(base) {
  return `${base} ${uniqueSuffix()}`;
}

module.exports = { buildInventoryItem, uniqueProductName, uniqueSuffix };
