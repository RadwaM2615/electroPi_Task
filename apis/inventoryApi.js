const { BaseApi } = require('./baseApi');

// ─── Inventory API ────────────────────────────────────────────────────────────
// Business methods for /api/v1/inventory/items. Methods return the raw
// APIResponse so specs assert on status codes and bodies themselves.
// Items created through a client are tracked and removed by cleanup().

class InventoryApi extends BaseApi {
  constructor(context) {
    super(context);
    /** Ids of items this client created, removed by cleanup(). */
    this.createdIds = [];
  }

  /** @param {object} payload */
  async createItem(payload) {
    const response = await this.post('/api/v1/inventory/items', { data: payload });
    if (response.status() === 201) this.createdIds.push((await response.json()).id);
    return response;
  }

  /** @param {number} id */
  getItem(id) {
    return this.get(`/api/v1/inventory/items/${id}`);
  }

  listItems() {
    return this.get('/api/v1/inventory/items');
  }

  /** @param {number} id */
  deleteItem(id) {
    return this.delete(`/api/v1/inventory/items/${id}`);
  }

  /** Deletes every item this client created (test teardown). */
  async cleanup() {
    for (const id of this.createdIds.splice(0)) await this.deleteItem(id);
  }
}

module.exports = { InventoryApi };
