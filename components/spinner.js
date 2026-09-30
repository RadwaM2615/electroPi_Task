// @ts-check
const { expect } = require('@playwright/test');

// Shared loading spinner. Wait for it to disappear before touching the content
// behind it, instead of sleeping for a fixed time.
class Spinner {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.root = page.getByTestId('spinner');
  }

  async waitUntilHidden() {
    await expect(this.root).toBeHidden();
  }
}

module.exports = { Spinner };
