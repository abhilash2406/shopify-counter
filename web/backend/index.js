// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import compression from "compression";
import express from "express";
import helmet from "helmet";
import serveStatic from "serve-static";

import shopify from "./src/config/shopify.js";
import { connectDb } from "./src/config/db.js";
import { env } from "./src/config/env.js";
import { DOCS_PATH, mountSwagger } from "./src/config/swagger.js";
import { httpLogger, logger } from "./src/config/winston.js";
import PrivacyWebhookHandlers from "./src/modules/webhooks/privacy.webhooks.js";
import { errorHandler } from "./src/middlewares/errorHandler.js";
import apiRoutes from "./src/routes/index.js";

await connectDb();

const PORT = env.port;

const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/../frontend/dist`
    : `${process.cwd()}/../frontend/`;

const app = express();

// Behind whatever reverse proxy this deploys on, so req.ip (which the
// public-route rate limiter keys on) reflects the real client rather than
// the proxy.
app.set("trust proxy", 1);

app.use(
  helmet({
    // Shopify's own shopify.cspHeaders() below sets the CSP needed to embed
    // this app in the Shopify admin iframe (frame-ancestors); helmet's
    // default CSP would fight it, so leave content security policy to that.
    contentSecurityPolicy: false,
    // Same reason: don't let helmet's X-Frame-Options header block embedding.
    frameguard: false,
  })
);
app.use(compression());
app.use(httpLogger);

// Interactive API docs, behind basic auth. Mounted before the catch-all
// below so it isn't swallowed by ensureInstalledOnShop().
const docsMounted = mountSwagger(app);

// Set up Shopify authentication and webhook handling
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  shopify.redirectToShopifyOrAppRoot()
);
app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: PrivacyWebhookHandlers })
);

// If you are adding routes outside of the /api path, remember to
// also add a proxy rule for them in web/frontend/vite.config.js

app.use(express.json({ limit: "100kb" }));

app.use("/api", apiRoutes);

app.use(errorHandler);

app.use(shopify.cspHeaders());
app.use(serveStatic(STATIC_PATH, { index: false }));

app.use("/*", shopify.ensureInstalledOnShop(), async (_req, res, _next) => {
  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(
      readFileSync(join(STATIC_PATH, "index.html"))
        .toString()
        .replace("%VITE_SHOPIFY_API_KEY%", process.env.SHOPIFY_API_KEY || "")
    );
});

app.listen(PORT, () => {
  logger.info(`API listening on http://localhost:${PORT} [${env.nodeEnv}]`);
  if (docsMounted) {
    logger.info(`API docs at http://localhost:${PORT}${DOCS_PATH}`);
  }
});
