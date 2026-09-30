// @ts-check
const { test, expect } = require('../../fixtures/api.fixture');
const { buildInventoryItem } = require('../../data/factories/productFactory');
const { apiBaseURL, categories } = require('../../config/electroPi.config');
const testData = require('../../data/inventoryItems.json');

// POST /api/v1/inventory/items. Scenario ids match docs/ASSESSMENT.md آ§2.1.
// Status codes follow the mock app's contract (422 for validation errors);
// confirm them against the real API contract before pointing at a real env.

const ENDPOINT = '/api/v1/inventory/items';

test.describe('POST /api/v1/inventory/items @api', () => {
  test('P1: valid token and full payload creates the item @smoke', async ({ apiAs }) => {
    const admin = await apiAs('admin');
    const payload = buildInventoryItem({ category_id: categories.tenantAElectronics });

    const response = await admin.createItem(payload);

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body).toMatchObject(payload);
    expect(body.id).toBeTruthy();
    expect(Date.parse(body.created_at)).not.toBeNaN();

    // Persisted: a follow-up read returns the same item
    const stored = await admin.getItem(body.id);
    expect(stored.status()).toBe(200);
    expect(await stored.json()).toMatchObject(payload);
  });

  test('P2: boundary values are stored exactly', async ({ apiAs }) => {
    const admin = await apiAs('admin');
    const { quantity, price, itemNameMaxLength } = testData.boundaries;
    const payload = buildInventoryItem({ quantity, price, item_name: 'X'.repeat(itemNameMaxLength) });

    const response = await admin.createItem(payload);

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.quantity).toBe(quantity);
    expect(body.price).toBe(price);
    expect(body.item_name).toHaveLength(itemNameMaxLength);
  });

  for (const { name, headers } of testData.invalidAuthHeaders) {
    test(`N1: ${name} Bearer token returns 401`, async ({ request, apiAs }) => {
      const payload = buildInventoryItem();

      const response = await request.post(`${apiBaseURL}${ENDPOINT}`, { data: payload, headers });

      expect(response.status()).toBe(401);
      expect((await response.json()).error).toBeTruthy();
      // No item created
      const items = await (await (await apiAs('admin')).listItems()).json();
      expect(items.map(i => i.sku)).not.toContain(payload.sku);
    });
  }

  test('N2: duplicate SKU in the same tenant returns 409', async ({ apiAs }) => {
    const admin = await apiAs('admin');
    const payload = buildInventoryItem();
    expect((await admin.createItem(payload)).status()).toBe(201);

    const duplicate = await admin.createItem({ ...payload, item_name: testData.duplicateItemName });

    expect(duplicate.status()).toBe(409);
    expect((await duplicate.json()).sku).toBe(payload.sku);
    // No second row created
    const items = await (await admin.listItems()).json();
    expect(items.filter(i => i.sku === payload.sku)).toHaveLength(1);
  });

  for (const { field, value } of testData.invalidValues) {
    test(`N3: invalid ${field} (${JSON.stringify(value)}) returns a field-level validation error`, async ({ apiAs }) => {
      const admin = await apiAs('admin');
      const payload = buildInventoryItem({ [field]: value });

      const response = await admin.createItem(payload);

      expect(response.status()).toBe(422);
      expect((await response.json()).errors).toHaveProperty(field);
      const items = await (await admin.listItems()).json();
      expect(items.map(i => i.sku)).not.toContain(payload.sku);
    });
  }
});

test.describe('Inventory items: multi-tenant and authorization risks @api @tenant', () => {
  test('category of another tenant is rejected and never linked', async ({ apiAs }) => {
    const admin = await apiAs('admin');
    const payload = buildInventoryItem({ category_id: categories.tenantBElectronics });

    const response = await admin.createItem(payload);

    expect(response.status()).toBe(422);
    expect((await response.json()).errors).toHaveProperty('category_id');
  });

  test('Cashier (non-admin) token returns 403', async ({ apiAs }) => {
    const cashier = await apiAs('cashier');

    const response = await cashier.createItem(buildInventoryItem());

    expect(response.status()).toBe(403);
  });

  test('same SKU in a different tenant succeeds (uniqueness is per tenant)', async ({ apiAs }) => {
    const payload = buildInventoryItem();
    const tenantA = await apiAs('admin');
    const tenantB = await apiAs('tenantBAdmin');

    expect((await tenantA.createItem(payload)).status()).toBe(201);
    const response = await tenantB.createItem({ ...payload, category_id: categories.tenantBElectronics });

    expect(response.status()).toBe(201);
    expect((await response.json()).tenant_id).not.toBe('tenant-a');
  });

  test('tenant B cannot read an item created by tenant A', async ({ apiAs }) => {
    const tenantA = await apiAs('admin');
    const created = await (await tenantA.createItem(buildInventoryItem())).json();

    const response = await (await apiAs('tenantBAdmin')).getItem(created.id);

    expect(response.status()).toBe(404);
  });

  test('price with more than 2 decimals is rejected consistently', async ({ apiAs }) => {
    const admin = await apiAs('admin');

    const response = await admin.createItem(buildInventoryItem({ price: testData.tooPrecisePrice }));

    expect(response.status()).toBe(422);
    expect((await response.json()).errors).toHaveProperty('price');
  });
});
