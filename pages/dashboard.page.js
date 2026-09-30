// @ts-check
const { InventoryPage } = require('./inventory.page');

class DashboardPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
  }

  /** @returns {Promise<InventoryPage>} */
  async openInventory() {
    await this.page.getByRole('link', { name: 'Inventory' }).click();
    await this.page.waitForURL('**/inventory');
    const inventory = new InventoryPage(this.page);
    await inventory.waitUntilLoaded();
    return inventory;
  }
}

module.exports = { DashboardPage };
