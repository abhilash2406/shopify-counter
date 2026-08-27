import express from "express";
import request from "supertest";
import mongoose from "mongoose";
import analyticsRoutes from "../../../src/modules/analytics/analytics.routes.js";
import { errorHandler } from "../../../src/middlewares/errorHandler.js";
import { Timer } from "../../../src/models/Timer.js";
import { Impression } from "../../../src/models/Impression.js";
import { connectTestDb, disconnectTestDb } from "../../helpers/testDb.js";

const SHOP = "shop-a.myshopify.com";
const OTHER_SHOP = "shop-b.myshopify.com";

function buildApp(shop = SHOP) {
  const app = express();
  app.use((req, res, next) => {
    res.locals.shopify = { session: { shop } };
    next();
  });
  app.use("/api/analytics", analyticsRoutes);
  app.use(errorHandler);
  return app;
}

function createEvergreenTimer(shop) {
  return Timer.create({
    name: "Sale",
    type: "evergreen",
    durationSeconds: 900,
    shop,
  });
}

describe("analytics API", () => {
  beforeAll(() => connectTestDb("analytics-routes"));

  beforeEach(async () => {
    await Timer.deleteMany({});
    await Impression.deleteMany({});
  });

  afterAll(disconnectTestDb);

  it("returns zeroed totals for a timer with no impressions", async () => {
    const timer = await createEvergreenTimer(SHOP);

    const res = await request(buildApp()).get(`/api/analytics/${timer._id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(0);
    expect(res.body.data.byDay).toEqual([]);
  });

  it("returns aggregated impression totals for the timer", async () => {
    const timer = await createEvergreenTimer(SHOP);
    await Impression.recordImpression(timer._id, SHOP);
    await Impression.recordImpression(timer._id, SHOP);

    const res = await request(buildApp()).get(`/api/analytics/${timer._id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.byDay).toHaveLength(1);
  });

  it("404s when the timer doesn't belong to the authenticated shop", async () => {
    const timer = await createEvergreenTimer(OTHER_SHOP);

    const res = await request(buildApp()).get(`/api/analytics/${timer._id}`);

    expect(res.status).toBe(404);
  });

  it("404s for an unknown timer id", async () => {
    const res = await request(buildApp()).get(
      `/api/analytics/${new mongoose.Types.ObjectId()}`
    );

    expect(res.status).toBe(404);
  });
});
