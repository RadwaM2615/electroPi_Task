const { request: playwrightRequest, test } = require('@playwright/test');
const { apiBaseURL } = require('../config/electroPi.config');
const tokenStore = require('../utils/tokenStore');

// ─── Base API Class ───────────────────────────────────────────────────────────
// Parent class for all API clients. Uses Playwright's APIRequestContext with
// baseURL and the user's Bearer token pre-configured, so subclasses only define
// business methods. Every request is a step in the HTML report, with the
// request and response attached.
//
//   class InventoryApi extends BaseApi {
//     getItem(id) { return this.get(`/api/v1/inventory/items/${id}`); }
//   }
//
//   const api = await InventoryApi.create('admin'); // token stored by AuthApi
//   await api.getItem(1);
//   await api.dispose();

class BaseApi {
  constructor(context) {
    this.context = context;
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  /** Creates a client that sends requests as the user stored under userKey. */
  static async create(userKey = 'default') {
    const token = tokenStore.getToken(userKey);
    if (!token) throw new Error(`Token for "${userKey}" not found`);

    const context = await playwrightRequest.newContext({
      baseURL: apiBaseURL,
      extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    });
    return new this(context);
  }

  async dispose() {
    await this.context.dispose();
  }

  // ─── Request wrapper with report steps and attachments ────────────────────

  async request(method, endpoint, options = {}) {
    return test.step(`API ${method.toUpperCase()} ${endpoint}`, async () => {
      const response = await this.context[method](endpoint, options);

      const body = await response.text();
      await test.info().attach(`${method.toUpperCase()} ${endpoint}`, {
        body: JSON.stringify({
          request: { method, url: `${apiBaseURL}${endpoint}`, data: options.data },
          response: { status: response.status(), body: body ? tryParseJson(body) : null },
        }, null, 2),
        contentType: 'application/json',
      });

      return response;
    });
  }

  // ─── HTTP helpers ─────────────────────────────────────────────────────────
  // Pass the endpoint path only; baseURL and auth headers come from the context.

  get(endpoint, options) { return this.request('get', endpoint, options); }
  post(endpoint, options) { return this.request('post', endpoint, options); }
  put(endpoint, options) { return this.request('put', endpoint, options); }
  patch(endpoint, options) { return this.request('patch', endpoint, options); }
  delete(endpoint, options) { return this.request('delete', endpoint, options); }
}

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

module.exports = { BaseApi };
