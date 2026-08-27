// The real verifyProxySignature middleware checks Shopify's App Proxy HMAC
// signature, which isn't something a request-level test should fabricate.
// It's covered on its own in verifyProxySignature.test.js; here it's swapped
// for a stand-in that trusts the query string, matching how attachShop.test
// isolates a router from the auth layer that normally sits in front of it.
jest.mock("../../../src/middlewares/verifyProxySignature.js", () => ({
  verifyProxySignature: (req, res, next) => {
    req.shop = req.query.shop;
    next();
  },
}));

import express from "express";
import request from "supertest";
import widgetRoutes from "../../../src/modules/widget/widget.routes.js";
import { errorHandler } from "../../../src/middlewares/errorHandler.js";
import { Timer } from "../../../src/models/Timer.js";
import { Impression } from "../../../src/models/Impression.js";
import { connectTestDb, disconnectTestDb } from "../../helpers/testDb.js";

const SHOP = "shop-a.myshopify.com";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/public", widgetRoutes);
  app.use(errorHandler);
  return app;
}

describe("public widget API", () => {
  beforeAll(() => connectTestDb("public-routes"));

  beforeEach(async () => {
    await Timer.deleteMany({});
    await Impression.deleteMany({});
  });

  afterAll(disconnectTestDb);

  describe("GET /api/public/timer-config", () => {
    it("returns 204 when no timer applies", async () => {
      const res = await request(buildApp())
        .get("/api/public/timer-config")
        .query({ shop: SHOP });

      expect(res.status).toBe(204);
    });

    it("returns the active timer's public config", async () => {
      await Timer.create({
        name: "Sale",
        type: "fixed",
        startDate: new Date(Date.now() - 60_000),
        endDate: new Date(Date.now() + 60_000),
        shop: SHOP,
      });

      const res = await request(buildApp())
        .get("/api/public/timer-config")
        .query({ shop: SHOP });

      expect(res.status).toBe(200);
      expect(res.body.type).toBe("fixed");
      expect(res.body.appearance).toBeDefined();
    });

    it("only matches a product-targeted timer for that product", async () => {
      const timer = await Timer.create({
        name: "Product sale",
        type: "evergreen",
        durationSeconds: 900,
        targeting: { mode: "products", resourceIds: ["111"] },
        shop: SHOP,
      });

      const miss = await request(buildApp())
        .get("/api/public/timer-config")
        .query({ shop: SHOP, productId: "999" });
      expect(miss.status).toBe(204);

      const hit = await request(buildApp())
        .get("/api/public/timer-config")
        .query({ shop: SHOP, productId: "111" });
      expect(hit.status).toBe(200);
      expect(hit.body.id).toBe(String(timer._id));
    });
  });

  describe("POST /api/public/impression", () => {
    it("records an impression for a timer owned by the shop", async () => {
      const timer = await Timer.create({
        name: "Sale",
        type: "evergreen",
        durationSeconds: 900,
        shop: SHOP,
      });

      const res = await request(buildApp())
        .post("/api/public/impression")
        .query({ shop: SHOP })
        .send({ timerId: String(timer._id) });

      expect(res.status).toBe(204);
      const totals = await Impression.totalsForTimer(timer._id);
      expect(totals.total).toBe(1);
    });

    it("silently no-ops for a timer owned by a different shop", async () => {
      const timer = await Timer.create({
        name: "Sale",
        type: "evergreen",
        durationSeconds: 900,
        shop: "someone-else.myshopify.com",
      });

      const res = await request(buildApp())
        .post("/api/public/impression")
        .query({ shop: SHOP })
        .send({ timerId: String(timer._id) });

      expect(res.status).toBe(204);
      const totals = await Impression.totalsForTimer(timer._id);
      expect(totals.total).toBe(0);
    });

    it("silently no-ops for a malformed timerId", async () => {
      const res = await request(buildApp())
        .post("/api/public/impression")
        .query({ shop: SHOP })
        .send({ timerId: "not-an-id" });

      expect(res.status).toBe(204);
    });
  });
});
