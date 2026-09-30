// @ts-check
const { test, expect } = require('../../fixtures/pages.fixture');
const { LoginPage } = require('../../pages/login.page');
const { baseURL, users } = require('../../config/electroPi.config');
const { uniqueProductName } = require('../../data/factories/productFactory');
const products = require('../../data/products.json');

test.describe('Inventory module', () => {
  // Remove products created through the UI, so the tenant stays clean.
  let createdNames = [];
  test.afterEach(async ({ apiAs }) => {
    if (createdNames.length === 0) return;
    const admin = await apiAs('admin');
    const items = await (await admin.listItems()).json();
    admin.createdIds.push(...items.filter(i => createdNames.includes(i.item_name)).map(i => i.id));
    createdNames = [];
  });

  test('Store Admin can add a product @smoke', async ({ loginPage }) => {
    const { name, price } = products.addProduct;
    const productName = uniqueProductName(name); // unique per run
    createdNames.push(productName);

    const dashboard = await loginPage.loginAs(users.admin.email, users.admin.password);
    const inventory = await dashboard.openInventory();
    await inventory.addProduct(productName, price);

    // Web-first assertions retry automatically until timeout
    await expect(inventory.toast.root).toBeVisible();
    await expect(inventory.toast.root).toContainText(products.successToastText);
  });

  test('saved product is listed in the inventory table @regression', async ({ loginPage }) => {
    const { name, price } = products.listedProduct;
    const productName = uniqueProductName(name);
    createdNames.push(productName);

    const dashboard = await loginPage.loginAs(users.admin.email, users.admin.password);
    const inventory = await dashboard.openInventory();
    await inventory.addProduct(productName, price);

    // Assert on the rendered data itself, not on the table being present
    const row = inventory.productRow(productName);
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(price);
  });

  test('a product added in tenant A is not visible to tenant B @tenant', async ({ browser, loginPage }) => {
    const { name, price } = products.tenantIsolationProduct;
    const productName = uniqueProductName(name);
    createdNames.push(productName);

    // Tenant A adds a product in the default context
    const tenantADashboard = await loginPage.loginAs(users.admin.email, users.admin.password);
    const tenantAInventory = await tenantADashboard.openInventory();
    await tenantAInventory.addProduct(productName, price);
    await expect(tenantAInventory.productRow(productName)).toHaveCount(1);

    // Tenant B logs in within an isolated browser context: no shared cookies or storage
    const tenantBContext = await browser.newContext({ baseURL });
    try {
      const tenantBLogin = new LoginPage(await tenantBContext.newPage());
      const tenantBDashboard = await tenantBLogin.loginAs(users.tenantBAdmin.email, users.tenantBAdmin.password);
      const tenantBInventory = await tenantBDashboard.openInventory();

      await expect(tenantBInventory.productRow(productName)).toHaveCount(0);
    } finally {
      await tenantBContext.close();
    }
  });
});
