# Countdown Timer App

A Shopify app that lets merchants create countdown timers (fixed-date or
"evergreen" per-visitor) and display them on storefront product/collection
pages to drive urgency, along with an admin dashboard to manage timers and
view impression analytics.

The app is a standard Shopify **embedded admin app** (Node backend + React
frontend, both managed by the Shopify CLI) paired with a **theme app
extension** that renders the actual countdown widget on the storefront.

---

## Project structure

```
counter-app/
├── shopify.app.toml           # Shopify app manifest (CLI + platform config)
├── package.json                # npm workspaces root
├── Dockerfile                  # Production image (backend serves built frontend)
├── web/
│   ├── backend/                 # Express API server
│   └── frontend/                # React (Polaris) embedded admin UI
└── extensions/
    ├── countdown-timer-widget-src/  # Preact widget source (build input)
    └── countdown-timer-widget/      # Built theme app extension (build output)
```

---

## Technology stack

### Root / tooling
| Purpose | Technology |
|---|---|
| Monorepo / package management | npm **workspaces** (`extensions/*`, `web/backend`, `web/frontend`) |
| Shopify tooling | `@shopify/cli` (`shopify app dev` / `deploy` / `build`) |
| Linting | ESLint 9 (flat config), `eslint-plugin-react`, `eslint-plugin-react-hooks` |
| Containerization | Docker (`node:18-alpine`), builds backend + frontend into one image |

### `web/backend` — API server
| Purpose | Technology |
|---|---|
| Runtime | Node.js (>=16.13), ESM (`"type": "module"`) |
| Web framework | Express |
| Shopify integration | `@shopify/shopify-app-express` (OAuth, session validation, webhooks, CSP headers) |
| Database / ODM | MongoDB via **Mongoose** |
| Session storage | `@shopify/shopify-app-session-storage-mongodb` (Shopify sessions persisted in Mongo) |
| Validation | **Zod** |
| Security | `helmet` (HTTP headers), `express-rate-limit` (public route throttling), `sanitize-html` (input sanitization), `express-basic-auth` (protects Swagger docs) |
| Logging | **Winston** (structured logs + HTTP request logging) |
| API docs | `swagger-jsdoc` + `swagger-ui-express`, served at `/api-docs` behind basic auth |
| Performance | `compression` (gzip), `serve-static` (serves built frontend) |
| Env config | `dotenv`, `cross-env` |
| Testing | **Jest** + `supertest` (HTTP assertions) + Babel (for ESM transform in tests) |
| Dev tooling | `nodemon` (auto-restart), `prettier` |

### `web/frontend` — Embedded admin UI
| Purpose | Technology |
|---|---|
| UI framework | **React 18** |
| Build tool / dev server | **Vite** (`@vitejs/plugin-react`) |
| Shopify UI kit | **Shopify Polaris** + `@shopify/polaris-icons` |
| Shopify embedding | `@shopify/app-bridge` + `@shopify/app-bridge-react` (embeds the app in the Shopify Admin iframe, session tokens) |
| Routing | `react-router-dom` |
| Data fetching / caching | `react-query` |
| Internationalization | `i18next`, `react-i18next`, `@shopify/i18next-shopify`, `@formatjs/*` |
| Styling | Polaris components + custom CSS (`styles/`) |
| Testing | **Jest** + `jest-environment-jsdom` + React Testing Library (`@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`) |
| Linting/formatting | Stylelint (`@shopify/stylelint-polaris`), Prettier |

### `extensions/` — Storefront theme app extension
| Purpose | Technology |
|---|---|
| Widget UI | **Preact** (lightweight React alternative) with classic `h()`/`Fragment` pragma |
| Build | **esbuild** — bundles `index.jsx` into a single minified IIFE (`widget.js`) |
| Storefront integration | Shopify **theme app extension** (`type = "theme"`), Liquid block (`countdown-timer.liquid`) |
| Styling | Plain CSS (`widget.css`) |
| Data source | Fetches from the backend via Shopify's **App Proxy** (`/apps/countdown-timer/*`), no direct API keys exposed to the storefront |

---

## How the pieces fit together

```
Storefront (theme)                 Shopify Platform              Embedded Admin
┌────────────────────┐        ┌─────────────────────┐      ┌───────────────────────┐
│ countdown-timer     │        │  App Proxy           │      │ React (Polaris) UI    │
│ .liquid block       │──────▶│  /apps/countdown-timer│      │ web/frontend          │
│ + widget.js (Preact)│  HMAC  │  → /api/public/*      │      └──────────┬────────────┘
└────────────────────┘  signed└──────────┬────────────┘                 │ session token
                                          ▼                              ▼
                              ┌─────────────────────────────────────────────┐
                              │        web/backend (Express API)             │
                              │  /api/public/*  – public, HMAC-verified      │
                              │  /api/timers    – admin CRUD, session-auth   │
                              │  /api/analytics – admin impressions, session │
                              └───────────────────┬───────────────────────────┘
                                                   ▼
                                            MongoDB (Timers, Impressions,
                                            Shopify sessions)
```

- **Merchant** manages timers (create/edit/delete, targeting, appearance) in
  the embedded admin ([web/frontend](web/frontend)), authenticated via
  Shopify session tokens.
- **Storefront visitors** never talk to the backend directly with a session —
  the widget calls the backend through Shopify's **App Proxy**, which signs
  every request with an HMAC that [verifyProxySignature](web/backend/src/middlewares/verifyProxySignature.js)
  validates.
- Every time the widget renders on a page, it fires a fire-and-forget
  "impression" ping, incrementing a per-day counter in MongoDB, which
  powers the analytics view in the admin.

---

## Backend module layout (`web/backend/src`)

| Folder | Responsibility |
|---|---|
| `config/` | Shopify SDK setup, MongoDB connection, env parsing, Winston logger, Swagger spec |
| `modules/timers/` | Admin CRUD for timers, targeting/sort/search logic, Zod validation |
| `modules/widget/` | Public (App Proxy) endpoints: resolve the applicable timer for a page, log impressions |
| `modules/analytics/` | Admin endpoint returning impression totals/day-by-day breakdown for a timer |
| `modules/webhooks/` | Mandatory Shopify privacy webhooks (customer/shop data request & redact) |
| `middlewares/` | `attachShop` (derive shop from session), `verifyProxySignature` (App Proxy HMAC), `rateLimiter` (120 req/min on public routes), `errorHandler` |
| `models/` | Mongoose schemas: `Timer` (targeting, appearance, fixed/evergreen), `Impression` (per-shop, per-timer, per-UTC-day counters) |
| `common/exceptions/` | Typed HTTP errors (`BadRequest`, `NotFound`, `Forbidden`, `Conflict`, `Unauthorized`, `TooManyRequests`, `ServiceUnavailable`) |
| `utils/` | Response envelope helper, HTML sanitization, targeting-match logic, timer status computation (`scheduled`/`active`/`expired`/`disabled`) |

Two timer types:
- **`fixed`** — runs between an explicit `startDate` and `endDate`, same for every visitor.
- **`evergreen`** — a per-visitor countdown of `durationSeconds`, started the first time that visitor's browser sees it and persisted in `localStorage` client-side (intentionally does not reset — see widget source comments).

---

## Getting started

### Prerequisites
- Node.js >= 16.13
- A MongoDB instance (local or hosted)
- A Shopify Partner account + development store
- Shopify CLI (installed as a project dependency, run via `npm run shopify`)

### Install
```bash
npm install          # installs all workspaces from the root
```

### Environment variables
Copy the example env files and fill in real values:
```bash
cp web/backend/.env.example web/backend/.env
cp web/frontend/.env.example web/frontend/.env
```

| File | Key vars |
|---|---|
| `web/backend/.env` | `PORT`, `MONGODB_URI`, `MONGODB_DB_NAME`, `LOG_LEVEL`, `SWAGGER_USER`/`SWAGGER_PASSWORD` |
| `web/frontend/.env` | `FRONTEND_PORT`, `BACKEND_URL` |

`SHOPIFY_API_KEY`/`SHOPIFY_API_SECRET` are injected automatically by the
Shopify CLI during `shopify app dev`, tied to the `client_id` in
[shopify.app.toml](shopify.app.toml).

### Run in development
```bash
npm run dev           # shopify app dev — runs backend + frontend + tunnel together
```

### Build the storefront widget
The theme extension's JS is pre-built and checked in; rebuild it after
changing the widget source:
```bash
cd extensions/countdown-timer-widget-src
npm run build          # esbuild → ../countdown-timer-widget/assets/widget.js
```

### Lint & test
```bash
npm run lint                          # ESLint across the whole workspace
npm run test                          # Jest (backend), via workspace script
```

### Deploy
```bash
npm run deploy         # shopify app deploy — pushes app config + extensions
```

### API docs
With the backend running and `SWAGGER_PASSWORD` set, interactive API docs
are available at `http://localhost:<PORT>/api-docs` (basic-auth protected).
For a quick static reference without running the server, see
[web/backend/API.md](web/backend/API.md).

---

## Security notes
- Admin routes (`/api/timers`, `/api/analytics`) are authenticated via
  Shopify's session token — the shop is always derived from the verified
  session, never a request parameter.
- Public routes (`/api/public/*`) are authenticated via the App Proxy's HMAC
  signature instead, and rate-limited to 120 requests/minute per IP.
- Impression tracking stores aggregate daily counts only — no per-visitor
  data is recorded.
