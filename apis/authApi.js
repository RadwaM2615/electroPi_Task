// @ts-check
const { request } = require('@playwright/test');
const { apiBaseURL } = require('../config/electroPi.config');
const tokenStore = require('../utils/tokenStore');

// ─── Auth API ─────────────────────────────────────────────────────────────────
// Logs users in through the API (never the UI) and stores their Bearer tokens
// in tokenStore under a user key, so API clients can run as that user:
//
//   await AuthApi.loginAndStore('admin', users.admin);
//   const admin = await InventoryApi.create('admin');

class AuthApi {
  /**
   * @param {{ email: string, password: string }} credentials
   * @returns {Promise<{ access_token: string, expires_in: number }>}
   */
  static async login({ email, password }) {
    const context = await request.newContext({ baseURL: apiBaseURL });
    try {
      const response = await context.post('/api/v1/auth/login', { data: { email, password } });
      if (response.status() !== 200) {
        throw new Error(`Login failed for "${email}": ${response.status()} ${await response.text()}`);
      }
      return await response.json();
    } finally {
      await context.dispose();
    }
  }

  /**
   * Logs in and stores the token under userKey.
   * @param {string} userKey
   * @param {{ email: string, password: string }} credentials
   */
  static async loginAndStore(userKey, credentials) {
    const { access_token } = await this.login(credentials);
    tokenStore.setToken(userKey, access_token);
  }
}

module.exports = { AuthApi };
