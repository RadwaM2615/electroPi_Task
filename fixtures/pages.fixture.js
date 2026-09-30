// @ts-check
const { test: apiTest, expect } = require('./api.fixture');
const { LoginPage } = require('../pages/login.page');

// ─── ELECTRO PI PAGES FIXTURE ─────────────────────────────────────────────────
// Injects page objects into UI specs. Extends the API fixture so UI specs can
// also seed or clean up data through the API (apiAs).

const test = apiTest.extend({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
});

module.exports = { test, expect };
