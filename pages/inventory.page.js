// @ts-check
const { expect } = require('@playwright/test');
const { Toast } = require('../components/toast');
const { Spinner } = require('../components/spinner');

class InventoryPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.toast = new Toast(page);
    this.spinner = new Spinner(page);
    this.productRows = page.getByTestId('product-row');
  }

  /** Opens the inventory module directly (for tests that start already logged in). */
  async goto() {
    await this.page.goto('/inventory');
    await this.waitUntilLoaded();
  }

  /** The product list renders asynchronously behind a spinner. */
  async waitUntilLoaded() {
    await this.spinner.waitUntilHidden();
  }

  /**
   * @param {string} name
   * @param {string} price
   */
  async addProduct(name, price) {
    await this.page.getByLabel('Product Name').fill(name);
    await this.page.getByLabel('Price').fill(price);

    // Start listening before the click, then sync on the real backend call
    const saveResponse = this.page.waitForResponse(
      (res) =>
        res.url().includes('/api/v1/inventory/items') &&
        res.request().method() === 'POST'
    );
    await this.page.getByRole('button', { name: 'Save' }).click();
    expect((await saveResponse).status()).toBe(201);
  }

  /**
   * Row in the product table for the given product name.
   * @param {string} name
   */
  productRow(name) {
    return this.productRows.filter({ hasText: name });
  }
}

module.exports = { InventoryPage };
