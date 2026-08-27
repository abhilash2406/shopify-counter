import express from "express";
import request from "supertest";
import mongoose from "mongoose";
import timersRoutes from "../../../src/modules/timers/timer.routes.js";
import { errorHandler } from "../../../src/middlewares/errorHandler.js";
import { Timer } from "../../../src/models/Timer.js";
import { connectTestDb, disconnectTestDb } from "../../helpers/testDb.js";

const SHOP = "shop-a.myshopify.com";
const OTHER_SHOP = "shop-b.myshopify.com";

// Stands in for shopify.validateAuthenticatedSession(), which populates
// res.locals.shopify.session in the real app before attachShop (mounted
// inside timersRoutes itself) derives req.shop from it.
function buildApp(shop = SHOP) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    res.locals.shopify = { session: { shop } };
    next();
  });
  app.use("/api/timers", timersRoutes);
  app.use(errorHandler);
  return app;
}

function validFixedTimerInput(overrides = {}) {
  return {
    name: "Summer sale",
    type: "fixed",
    startDate: "2026-01-01T00:00:00.000Z",
    endDate: "2026-01-31T00:00:00.000Z",
    ...overrides,
  };
}

describe("timers API", () => {
  beforeAll(() => connectTestDb("timers-routes"));

  beforeEach(async () => {
    await Timer.deleteMany({});
  });

  afterAll(disconnectTestDb);

  describe("POST /api/timers", () => {
    it("creates a timer scoped to the authenticated shop", async () => {
      const res = await request(buildApp())
        .post("/api/timers")
        .send(validFixedTimerInput());

      expect(res.status).toBe(201);
      expect(res.body.data.timer.name).toBe("Summer sale");

      const stored = await Timer.findById(res.body.data.timer._id);
      expect(stored.shop).toBe(SHOP);
    });

    it("rejects a timer missing a required field", async () => {
      const res = await request(buildApp())
        .post("/api/timers")
        .send({ type: "fixed" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/name is required/);
    });

    it("wraps success and failure in the standard envelope", async () => {
      const ok = await request(buildApp())
        .post("/api/timers")
        .send(validFixedTimerInput());

      expect(ok.body).toMatchObject({ success: true, message: expect.any(String) });
      expect(ok.body.data.timer).toBeDefined();

      const bad = await request(buildApp()).post("/api/timers").send({});

      expect(bad.body).toMatchObject({
        success: false,
        message: expect.any(String),
        code: "BAD_REQUEST",
      });
      expect(bad.body.data).toBeUndefined();
    });
  });

  describe("GET /api/timers", () => {
    it("lists only timers belonging to the authenticated shop", async () => {
      await Timer.create({ ...validFixedTimerInput(), shop: SHOP });
      await Timer.create({ ...validFixedTimerInput(), shop: OTHER_SHOP });

      const res = await request(buildApp()).get("/api/timers");

      expect(res.status).toBe(200);
      expect(res.body.data.timers).toHaveLength(1);
      expect(res.body.data.timers[0].shop).toBe(SHOP);
    });

    describe("ordering", () => {
      const names = (res) => res.body.data.timers.map((timer) => timer.name);

      // Ordering is no longer selectable, so the only thing to pin is that the
      // service applies newest-first itself rather than leaving it to Mongo.
      it("always returns newest first", async () => {
        // Distinct createdAt values, inserted in a deliberately unsorted order.
        await Timer.create({ ...validFixedTimerInput({ name: "beta" }), shop: SHOP, createdAt: new Date("2026-02-01") });
        await Timer.create({ ...validFixedTimerInput({ name: "Alpha" }), shop: SHOP, createdAt: new Date("2026-03-01") });
        await Timer.create({ ...validFixedTimerInput({ name: "charlie" }), shop: SHOP, createdAt: new Date("2026-01-01") });

        const res = await request(buildApp()).get("/api/timers");

        expect(names(res)).toEqual(["Alpha", "beta", "charlie"]);
      });

      // Search and sort are gone, but an older client may still append them.
      // The list query ignores unknown keys, so they must be inert, not a 400.
      it("ignores leftover search and sort params", async () => {
        await Timer.create({ ...validFixedTimerInput({ name: "Summer sale" }), shop: SHOP });
        await Timer.create({ ...validFixedTimerInput({ name: "Black Friday" }), shop: SHOP });

        const res = await request(buildApp()).get(
          "/api/timers?search=summer&sort=name-asc"
        );

        expect(res.status).toBe(200);
        expect(names(res).sort()).toEqual(["Black Friday", "Summer sale"]);
      });
    });

    describe("pagination", () => {
      const names = (res) => res.body.data.timers.map((timer) => timer.name);

      // 12 timers with distinct, ascending createdAt values, so the fixed
      // newest-first order is predictable: t12 down to t01.
      const seedMany = async (count = 12) => {
        for (let i = 1; i <= count; i += 1) {
          const day = String(i).padStart(2, "0");
          await Timer.create({
            ...validFixedTimerInput({ name: `t${day}` }),
            shop: SHOP,
            createdAt: new Date(`2026-01-${day}T00:00:00.000Z`),
          });
        }
      };

      it("returns at most 10 per page by default", async () => {
        await seedMany();

        const res = await request(buildApp()).get("/api/timers");

        expect(res.body.data.timers).toHaveLength(10);
        expect(names(res)[0]).toBe("t12");
        expect(res.body.data.pagination).toEqual({
          total: 12,
          limit: 10,
          offset: 0,
          hasMore: true,
        });
      });

      it("returns the remainder on the next page", async () => {
        await seedMany();

        const res = await request(buildApp()).get("/api/timers?offset=10");

        expect(names(res)).toEqual(["t02", "t01"]);
        expect(res.body.data.pagination).toMatchObject({
          total: 12,
          offset: 10,
          hasMore: false,
        });
      });

      it("counts the whole result set, not just the page", async () => {
        await seedMany();

        const res = await request(buildApp()).get("/api/timers?limit=3");

        expect(res.body.data.timers).toHaveLength(3);
        expect(res.body.data.pagination.total).toBe(12);
      });

      it("returns an empty page past the end", async () => {
        await seedMany(3);

        const res = await request(buildApp()).get("/api/timers?offset=50");

        expect(res.body.data.timers).toEqual([]);
        expect(res.body.data.pagination).toMatchObject({
          total: 3,
          hasMore: false,
        });
      });

      it.each([
        ["limit above the cap", "limit=11", /limit must be at most 10/],
        ["limit of zero", "limit=0", /limit must be at least 1/],
        ["a negative offset", "offset=-1", /offset must not be negative/],
        ["a fractional limit", "limit=2.5", /limit must be a whole number/],
        ["a non-numeric limit", "limit=abc", /limit must be a number/],
      ])("rejects %s", async (_label, qs, expected) => {
        const res = await request(buildApp()).get(`/api/timers?${qs}`);

        expect(res.status).toBe(400);
        expect(res.body).toMatchObject({ success: false, code: "BAD_REQUEST" });
        expect(res.body.message).toMatch(expected);
      });
    });
  });

  describe("GET /api/timers/:id", () => {
    it("returns a timer with its derived status", async () => {
      const timer = await Timer.create({ ...validFixedTimerInput(), shop: SHOP });

      const res = await request(buildApp()).get(`/api/timers/${timer._id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.timer.name).toBe("Summer sale");
      expect(res.body.data.timer.targeting.mode).toBe("all");
    });

    it("404s for a timer belonging to a different shop", async () => {
      const timer = await Timer.create({ ...validFixedTimerInput(), shop: OTHER_SHOP });

      const res = await request(buildApp()).get(`/api/timers/${timer._id}`);

      expect(res.status).toBe(404);
    });

    it("404s for an unknown id", async () => {
      const res = await request(buildApp()).get(
        `/api/timers/${new mongoose.Types.ObjectId()}`
      );

      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/timers/:id", () => {
    it("updates fields and returns the merged timer", async () => {
      const timer = await Timer.create({ ...validFixedTimerInput(), shop: SHOP });

      const res = await request(buildApp())
        .patch(`/api/timers/${timer._id}`)
        .send({ name: "Winter sale" });

      expect(res.status).toBe(200);
      expect(res.body.data.timer.name).toBe("Winter sale");
    });

    it("rejects an update that leaves the timer invalid", async () => {
      const timer = await Timer.create({ ...validFixedTimerInput(), shop: SHOP });

      const res = await request(buildApp())
        .patch(`/api/timers/${timer._id}`)
        .send({ type: "evergreen" });

      expect(res.status).toBe(400);
    });

    it("404s for a timer belonging to a different shop", async () => {
      const timer = await Timer.create({ ...validFixedTimerInput(), shop: OTHER_SHOP });

      const res = await request(buildApp())
        .patch(`/api/timers/${timer._id}`)
        .send({ name: "Winter sale" });

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/timers/:id", () => {
    it("deletes a timer belonging to the authenticated shop", async () => {
      const timer = await Timer.create({ ...validFixedTimerInput(), shop: SHOP });

      const res = await request(buildApp()).delete(`/api/timers/${timer._id}`);

      expect(res.status).toBe(204);
      expect(await Timer.findById(timer._id)).toBeNull();
    });

    it("404s for a timer belonging to a different shop, without deleting it", async () => {
      const timer = await Timer.create({ ...validFixedTimerInput(), shop: OTHER_SHOP });

      const res = await request(buildApp()).delete(`/api/timers/${timer._id}`);

      expect(res.status).toBe(404);
      expect(await Timer.findById(timer._id)).not.toBeNull();
    });
  });
});
