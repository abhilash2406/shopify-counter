import { Router } from "express";
import shopify from "../config/shopify.js";
import { publicRateLimiter } from "../middlewares/rateLimiter.js";
import widgetRoutes from "../modules/widget/widget.routes.js";
import timerRoutes from "../modules/timers/timer.routes.js";
import analyticsRoutes from "../modules/analytics/analytics.routes.js";

const router = Router();

// Storefront-facing routes, reached via Shopify's App Proxy. These sit before
// the embedded-admin session check below since they authenticate via the
// proxy's own HMAC signature instead (see verifyProxySignature middleware).
router.use("/public", publicRateLimiter, widgetRoutes);

router.use(shopify.validateAuthenticatedSession());

router.use("/timers", timerRoutes);
router.use("/analytics", analyticsRoutes);

export default router;
