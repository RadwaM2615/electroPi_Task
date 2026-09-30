# electroPi_Task

Electro Pi — QA Automation Engineer technical assessment.

Test automation for a multi-tenant POS and inventory web app: Playwright UI and API tests and a GitHub Actions pipeline.

The written answers to every assessment question, including the Postman and SQL answers, are in **[docs/ASSESSMENT.md](docs/ASSESSMENT.md)**.

The tests run against a small mock of the app in [mock-app/](mock-app/server.js), which Playwright starts automatically. No setup or credentials are needed.

## Run it

Requires Node.js 18 or later.

```
npm install
npx playwright install chromium

npm test              # all UI + API tests
npm run test:ui       # UI tests only
npm run test:api      # API tests only
npm run test:smoke    # @smoke tests only
npm run report        # open the HTML report of the last run
npm run mock          # start the mock app on http://localhost:3100 to try it by hand
```

To watch the UI tests in a browser: `npx playwright test --ui`, or `npx playwright test tests/ui --headed --workers=1`.

## Project structure

```
tests/ui/          UI tests: add a product, product listed, tenant isolation
tests/api/         API tests for POST /api/v1/inventory/items
pages/             Page Objects: LoginPage, DashboardPage, InventoryPage
components/        Shared UI widgets: Toast, Spinner
apis/              API clients: BaseApi, AuthApi, InventoryApi
fixtures/          Playwright fixtures: page objects, logged-in API users, cleanup
data/              JSON test data, plus factories that make names and SKUs unique
config/            Base URL and users (overridable with environment variables)
mock-app/          Mock of the Electro Pi app (UI + REST API)
.github/workflows/ CI pipeline: API job gates the sharded UI job
docs/              Assessment answers
```

## Test users

Seeded in the mock app (demo-only credentials, stored in [data/users.json](data/users.json)):

| User | Email | Password |
|---|---|---|
| Tenant A Store Admin | admin@tenant-a.test | Admin#123 |
| Tenant A Cashier | cashier@tenant-a.test | Cashier#123 |
| Tenant B Store Admin | admin@tenant-b.test | Admin#123 |

## Running against a real environment

Set `ELECTROPI_BASE_URL` (the mock app is then not started) and provide the credentials as environment variables: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CASHIER_EMAIL`, `CASHIER_PASSWORD`, `TENANT_B_ADMIN_EMAIL`, `TENANT_B_ADMIN_PASSWORD`.
