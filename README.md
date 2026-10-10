# Pharmacy Management

Monorepo starter for a pharmacy system: an installable React web app, an Expo / React Native mobile app, a FastAPI backend, and local PostgreSQL. Both clients call the API; PostgreSQL is never exposed to either client.

## Requirements

- Node.js 22
- Python 3.11+ and [uv](https://docs.astral.sh/uv/)
- Docker Desktop (for the local PostgreSQL service)

The project is pinned to Python 3.11 through `uv`, which can manage that runtime without replacing the system Python.

## Start locally

1. Install JavaScript dependencies: `npm install`
2. Start PostgreSQL: `npm run db:up`
3. Start the API in one terminal: `npm run dev:api`
4. Start the web PWA in another: `npm run dev:web`
5. Start the mobile app in another: `npm run dev:mobile`

Copy the relevant `.env.example` to `.env` in `apps/api`, `apps/web`, or `apps/mobile` only when changing its defaults.

The API is at `http://localhost:8000`; its interactive docs are at `http://localhost:8000/docs`. The web app is at `http://localhost:5173`.

Run backend tests with `cd apps/api && uv run pytest`. Missing tables are created on API startup for local development; add migrations before using this against a deployed database.

## Authentication and Roles

On first API startup, `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` create the initial admin if that email does not already exist. The ignored local `apps/api/.env` contains the development bootstrap password; do not commit or reuse it. Changing the environment password does not reset an existing account. Admins create and disable staff accounts in **Staff accounts**.

- **Cashier:** dashboard and counter sales.
- **Manager:** cashier access plus medicines, batches, and suppliers.
- **Admin:** all modules plus staff roles, account status, password reset, and session revocation.

Access JWTs expire after 15 minutes. The HttpOnly refresh cookie rotates on use, lasts 30 days between activity, and has a 90-day absolute cap. Production requires a unique `AUTH_JWT_SECRET`, HTTPS, and `AUTH_COOKIE_SECURE=true`. The web app keeps access tokens in memory and refreshes through the API; it does not persist them in local storage.

## Dashboard

The dashboard uses live API data: today's sales in Asia/Karachi, active medicine count, low-stock medicines, batches expiring within 90 days, top medicines by units sold in the last 30 days, and recent receipts. Stock and expiry figures ignore expired batches.

### Test on a physical phone

The phone cannot use `localhost` to reach the API on your computer. Put both devices on the same Wi-Fi, allow port 8000 through the computer's firewall, and set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` to your computer's LAN address, for example `http://192.168.1.20:8000/api/v1`. Restart Expo after changing the value. Use the Android emulator's host alias (`10.0.2.2`) when applicable; simulator networking differs by platform. If opening the web PWA from the phone, set its `VITE_API_BASE_URL` to the same LAN host and add the PWA's LAN origin to `CORS_ORIGINS` in `apps/api/.env`.

The sample database credentials are for local development only. Do not reuse them in a deployed environment. A real deployment needs authenticated access, HTTPS, managed secrets, backups, and a jurisdiction-specific compliance review.

## Web Modules

- **Medicines:** searchable catalogue with barcode, brand/generic, strength, form, sale unit, and reorder threshold.
- **Stock batches:** receive a batch against a supplier and invoice reference with quantity, purchase price, sale price, and expiry. Sales allocate unexpired stock by earliest expiry first.
- **Suppliers:** contact records are archived instead of physically deleted so batch history stays connected.
- **Counter sales:** scan a barcode into the search field or search by medicine, adjust quantities, optionally record walk-in details, choose cash/card/mobile-wallet payment, and apply a PKR discount.
- **Receipts:** every completed sale gets a receipt number and includes its sold batches and expiry dates. The print view is formatted for an 80 mm receipt printer through the browser's print dialog.

The local-market workflow choices were informed by feature claims from Pakistani pharmacy software vendors such as [MediPOS](https://medipos.pk/), [BazaarMint](https://www.bazaarmint.com/pharmacy-pos-software), and [eHisabKitab](https://ehisabkitab.com/pos-software-pharmacies). These are examples of product conventions, not an authoritative market survey.

This first web release does not include FBR/POS integration, Urdu localization, offline checkout, customer udhaar/credit settlement, or pack-to-tablet conversion. Those need separate workflows and should be added based on the target pharmacy's actual counter process.

## Layout

- `apps/web`: React + Vite PWA for desktop workflows
- `apps/mobile`: Expo / React Native app for mobile workflows
- `apps/api`: FastAPI service and PostgreSQL connection
- `packages/contracts`: TypeScript API response types shared by clients
- `apps/web/src/features`: medicines, suppliers, and sales components, hooks, and services
- `apps/web/src/features/auth`: login and session bootstrap
- `apps/web/src/features/users`: admin staff management
- `apps/web/src/features/dashboard`: live operational metrics
- `apps/web/src/shared`: API client, React Query setup, shared components, and Zustand UI state

The PWA manifest and service worker make the web app installable in supported browsers when served from localhost or HTTPS. Offline writes and inventory synchronization are intentionally not implemented.