import { Router } from "express";
import { verifyProxySignature } from "../../middlewares/verifyProxySignature.js";
import * as widgetController from "./widget.controller.js";

const router = Router();

router.use(verifyProxySignature);

/**
 * @openapi
 * /api/public/timer-config:
 *   get:
 *     tags: [Public]
 *     summary: Best-matching timer for a storefront context
 *     description: >
 *       Reached from the storefront as
 *       `/apps/countdown-timer/timer-config` via Shopify's App Proxy, which
 *       appends `shop`, `timestamp` and `signature`; requests that fail HMAC
 *       verification are rejected.
 *
 *
 *       Returns the single active, enabled timer whose targeting best matches
 *       the context — most specific wins: product > collection > all. Responds
 *       `204` when nothing matches, which the widget treats as "render
 *       nothing". Rate limited to 120 requests/minute per IP.
 *     parameters:
 *       - in: query
 *         name: productId
 *         schema: { type: string }
 *         description: Plain numeric product id of the page being viewed.
 *       - in: query
 *         name: collectionIds
 *         schema: { type: string }
 *         description: >
 *           Comma-separated plain numeric collection ids for the page being
 *           viewed — every collection the product belongs to, or the single
 *           collection on a collection page. A collection-targeted timer
 *           matches if it targets any one of them. Capped at 50 ids.
 *         example: '412,998'
 *       - in: query
 *         name: collectionId
 *         schema: { type: string }
 *         description: Deprecated single-id form; still accepted.
 *     responses:
 *       200:
 *         description: >
 *           The matching timer's public config, returned **unwrapped** — no
 *           `{ success, message, data }` envelope. The widget bundle already
 *           deployed in merchant themes reads these fields directly, so this
 *           shape is a published contract. Sent with
 *           `Cache-Control: public, max-age=30` — safe because this is a
 *           timer's static definition, not a per-visitor countdown value.
 *         headers:
 *           Cache-Control:
 *             schema: { type: string }
 *             description: 'public, max-age=30'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PublicTimerConfig'
 *       204:
 *         description: No timer applies to this context
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
router.get("/timer-config", widgetController.getTimerConfig);

/**
 * @openapi
 * /api/public/impression:
 *   post:
 *     tags: [Public]
 *     summary: Record one impression for a timer
 *     description: >
 *       Increments today's UTC-day impression bucket. Silently no-ops (still
 *       `204`) when the timer id is missing, malformed, unknown, or owned by
 *       another shop — the widget never needs to know which, and a public
 *       endpoint should not leak that distinction. Rate limited to 120
 *       requests/minute per IP.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [timerId]
 *             properties:
 *               timerId:
 *                 type: string
 *                 example: 665f1b2c3d4e5f6a7b8c9d0e
 *     responses:
 *       204:
 *         description: Recorded, or silently ignored (no content either way)
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
router.post("/impression", widgetController.logImpression);

export default router;
