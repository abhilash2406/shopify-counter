# API Reference

Brief reference for the Countdown Timer app's backend API. For full request/
response schemas, run the app and visit the interactive Swagger UI at
`/api-docs` (basic-auth protected — see [README.md](../../README.md#api-docs)).

## Auth model

Two separate schemes are used, never mixed on the same route:

| Routes | Auth | Shop comes from |
|---|---|---|
| `/api/timers/*`, `/api/analytics/*` | Shopify **session token** (embedded admin) | Verified session (`req.shop`), never a request param |
| `/api/public/*` | Shopify **App Proxy HMAC signature** | `req.query.shop`, verified against the signature |

Public routes are also rate-limited to **120 requests/minute per IP**.

## Response envelope

Admin endpoints (`/api/timers`, `/api/analytics`) always respond:
```json
{ "success": true, "message": "...", "data": { } }
```
Errors:
```json
{ "success": false, "message": "...", "code": "NOT_FOUND", "details": { } }
```
Public endpoints (`/api/public/*`) return unwrapped bodies — the storefront
widget bundle already deployed in merchant themes reads these fields
directly, so that shape is a fixed contract.

## HTTP status codes used

| Code | Meaning |
|---|---|
| 200 | OK (GET, PATCH) |
| 201 | Created (POST) |
| 204 | No content (DELETE, public impression logging, no timer-config match) |
| 400 | Validation failed (Zod) |
| 401 | Missing/invalid session |
| 403 | Invalid App Proxy signature |
| 404 | Not found, or not owned by the authenticated shop |
| 409 | Optimistic-concurrency conflict (stale `expectedUpdatedAt` on PATCH) |
| 429 | Rate limit exceeded |
| 500 | Unexpected server error |

---

## Admin — Timers (`/api/timers`, session-authenticated)

| Method | Path | Description |
|---|---|---|
| GET | `/api/timers` | List the shop's timers. Query: `limit` (max 10, default 10), `offset`, `search` (name substring), `sort` (`newest`\|`oldest`\|`name-asc`\|`name-desc`). Each timer includes a computed `status`. |
| POST | `/api/timers` | Create a timer. Body: `name`, `type` (`fixed`\|`evergreen`), `startDate`/`endDate` (fixed) or `durationSeconds` (evergreen), `targeting`, `appearance`. → `201` |
| GET | `/api/timers/:id` | Fetch one timer. When `targeting.mode` isn't `all`, includes `targeting.resources` (product/collection titles resolved live via Admin GraphQL). |
| PATCH | `/api/timers/:id` | Partially update a timer. Same validation as create, applied to the merged document. Optional body field `expectedUpdatedAt`: the `updatedAt` the caller last fetched — if it no longer matches, the request fails with `409` instead of silently overwriting a change made elsewhere (optimistic concurrency; omit to update unconditionally). |
| DELETE | `/api/timers/:id` | Delete a timer. → `204` |

**Timer types:**
- `fixed` — runs between `startDate` and `endDate`, same for every visitor.
- `evergreen` — a `durationSeconds` countdown, started per-visitor (client-side, via `localStorage`) the first time they see the widget.

**Computed `status`:** `scheduled` | `active` | `expired` | `disabled` (never stored, derived from dates + `isEnabled`).

---

## Admin — Analytics (`/api/analytics`, session-authenticated)

| Method | Path | Description |
|---|---|---|
| GET | `/api/analytics/:timerId` | Impression totals for one timer owned by the shop: all-time `total` plus `byDay` (oldest first, per-UTC-day counts). |

---

## Public — Storefront widget (`/api/public`, App Proxy HMAC-authenticated)

Reached from the storefront as `/apps/countdown-timer/*`, proxied by Shopify
to `/api/public/*` on this server.

| Method | Path | Description |
|---|---|---|
| GET | `/api/public/timer-config` | Returns the single best-matching active/enabled timer for a page. Query: `productId`, `collectionIds` (comma-separated, max 50). Matching priority: product > collection > all. → `200` with the trimmed public config, or `204` if nothing matches. Response cached `public, max-age=30`. |
| POST | `/api/public/impression` | Records one impression for `{ timerId }` (increments today's UTC-day counter). Always `204`, even if the id is missing/invalid/unowned — a public endpoint must not leak which. |

---

## Auth & webhooks (mounted outside `/api`, handled by `@shopify/shopify-app-express`)

| Method | Path | Description |
|---|---|---|
| GET | `/api/auth` | Begins Shopify OAuth. |
| GET | `/api/auth/callback` | OAuth callback; redirects into the embedded app on success. |
| POST | `/api/webhooks` | Mandatory Shopify privacy webhooks: `CUSTOMERS_DATA_REQUEST` (no-op — no PII stored), `CUSTOMERS_REDACT` (no-op), `SHOP_REDACT` (deletes the shop's timers + impressions). |

---

## Not covered here

- Full OpenAPI 3.0 schemas (request/response shapes, enums, examples) — see
  `/api-docs`, generated from JSDoc in each `*.routes.js` file.
- Error `code` values beyond the status-code table above — see
  `web/backend/src/common/exceptions/`.
