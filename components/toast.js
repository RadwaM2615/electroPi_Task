// @ts-check

// Shared toast notification used by every module.
class Toast {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.root = page.getByRole('alert'); // or page.getByTestId('toast')
  }
}

module.exports = { Toast };
