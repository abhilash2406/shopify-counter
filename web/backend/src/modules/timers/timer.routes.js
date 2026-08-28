import { Router } from "express";
import { attachShop } from "../../middlewares/attachShop.js";
import * as timerController from "./timer.controller.js";

const router = Router();

router.use(attachShop);

/**
 * @openapi
 * /api/timers:
 *   get:
 *     tags: [Timers]
 *     summary: List the shop's timers, newest first
 *     description: >
 *       Each timer is annotated with a computed `status`. The shop comes from
 *       the verified Shopify session, never a parameter.
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 10, default: 10 }
 *         description: >
 *           Page size. 10 is both the default and the hard maximum — a larger
 *           value is rejected with a 400 rather than silently clamped.
 *       - in: query
 *         name: offset
 *         schema: { type: integer, minimum: 0, default: 0 }
 *         description: Number of records to skip before the page starts.
 *       - in: query
 *         name: search
 *         schema: { type: string, maxLength: 120 }
 *         description: Case-insensitive substring match against the timer name.
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, oldest, name-asc, name-desc]
 *           default: newest
 *         description: Sort order applied before paging.
 *     responses:
 *       200:
 *         description: The shop's timers
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         timers:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Timer'
 *                         pagination:
 *                           $ref: '#/components/schemas/Pagination'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/", timerController.listTimers);

/**
 * @openapi
 * /api/timers:
 *   post:
 *     tags: [Timers]
 *     summary: Create a timer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TimerInput'
 *           examples:
 *             fixed:
 *               summary: Fixed-date timer
 *               value:
 *                 name: Summer Sale
 *                 type: fixed
 *                 startDate: '2026-08-01T00:00:00.000Z'
 *                 endDate: '2026-09-30T00:00:00.000Z'
 *                 targeting: { mode: all, resourceIds: [] }
 *             evergreen:
 *               summary: Per-visitor evergreen timer
 *               value:
 *                 name: Flash Offer
 *                 type: evergreen
 *                 durationSeconds: 900
 *                 targeting: { mode: products, resourceIds: ['1234567890'] }
 *     responses:
 *       201:
 *         description: Timer created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         timer:
 *                           $ref: '#/components/schemas/Timer'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post("/", timerController.createTimer);

/**
 * @openapi
 * /api/timers/{id}:
 *   get:
 *     tags: [Timers]
 *     summary: Fetch one timer owned by the shop
 *     description: >
 *       When `targeting.mode` is not `all`, the response additionally includes
 *       `targeting.resources` — product/collection titles resolved live from
 *       the Admin GraphQL API so the edit form can show names, not raw IDs.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Timer id
 *     responses:
 *       200:
 *         description: The timer
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         timer:
 *                           $ref: '#/components/schemas/Timer'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/:id", timerController.getTimer);

/**
 * @openapi
 * /api/timers/{id}:
 *   patch:
 *     tags: [Timers]
 *     summary: Partially update a timer
 *     description: >
 *       Same validation as create, applied to the merged result. Pass
 *       `expectedUpdatedAt` (the `updatedAt` you last fetched) to guard
 *       against clobbering a change made elsewhere in the meantime — omit it
 *       to update unconditionally.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Timer id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/TimerInput'
 *               - type: object
 *                 properties:
 *                   expectedUpdatedAt:
 *                     type: string
 *                     format: date-time
 *                     description: >
 *                       Optional optimistic-concurrency check. If present and
 *                       it no longer matches the timer's current `updatedAt`,
 *                       the request fails with 409 instead of overwriting the
 *                       newer change.
 *           example:
 *             isEnabled: false
 *     responses:
 *       200:
 *         description: The updated timer
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         timer:
 *                           $ref: '#/components/schemas/Timer'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.patch("/:id", timerController.updateTimer);

/**
 * @openapi
 * /api/timers/{id}:
 *   delete:
 *     tags: [Timers]
 *     summary: Delete a timer
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Timer id
 *     responses:
 *       204:
 *         description: Deleted (no content)
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete("/:id", timerController.deleteTimer);

export default router;
