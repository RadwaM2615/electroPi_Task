// @ts-check
const { DashboardPage } = require('./dashboard.page');

class LoginPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
  }

  /**
   * @param {string} email
   * @param {string} password
   * @returns {Promise<DashboardPage>}
   */
  async loginAs(email, password) {
    await this.page.goto('/login');
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByLabel('Password').fill(password);
    await this.page.getByRole('button', { name: 'Log in' }).click();
    await this.page.waitForURL('**/dashboard');
    return new DashboardPage(this.page);
  }
}

module.exports = { LoginPage };
