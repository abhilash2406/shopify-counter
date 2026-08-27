import { Router } from "express";
import { attachShop } from "../../middlewares/attachShop.js";
import * as analyticsController from "./analytics.controller.js";

const router = Router();

router.use(attachShop);

/**
 * @openapi
 * /api/analytics/{timerId}:
 *   get:
 *     tags: [Analytics]
 *     summary: Impression totals for one timer
 *     description: >
 *       Returns the all-time total plus a per-UTC-day breakdown, oldest day
 *       first. Impressions are aggregate counts only — no visitor-level data
 *       is stored.
 *     parameters:
 *       - in: path
 *         name: timerId
 *         required: true
 *         schema: { type: string }
 *         description: Timer id
 *     responses:
 *       200:
 *         description: Impression totals
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Analytics'
 *             example:
 *               success: true
 *               message: Analytics fetched successfully.
 *               data:
 *                 total: 42
 *                 byDay:
 *                   - day: '2026-08-01T00:00:00.000Z'
 *                     count: 12
 *                   - day: '2026-08-02T00:00:00.000Z'
 *                     count: 30
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/:timerId", analyticsController.getTimerAnalytics);

export default router;
