import mongoose from "mongoose";
import { Impression } from "../../src/models/Impression.js";
import { connectTestDb, disconnectTestDb } from "../helpers/testDb.js";

describe("Impression.recordImpression", () => {
  beforeAll(() => connectTestDb("impression-model"));

  beforeEach(async () => {
    await Impression.deleteMany({});
  });

  afterAll(disconnectTestDb);

  it("creates a new day bucket with count 1 on first impression", async () => {
    const timerId = new mongoose.Types.ObjectId();
    await Impression.recordImpression(timerId, "shop.myshopify.com");

    const totals = await Impression.totalsForTimer(timerId);
    expect(totals.total).toBe(1);
    expect(totals.byDay).toHaveLength(1);
  });

  it("increments the same day's bucket instead of creating duplicates", async () => {
    const timerId = new mongoose.Types.ObjectId();
    const now = new Date();

    await Impression.recordImpression(timerId, "shop.myshopify.com", now);
    await Impression.recordImpression(timerId, "shop.myshopify.com", now);
    await Impression.recordImpression(timerId, "shop.myshopify.com", now);

    const totals = await Impression.totalsForTimer(timerId);
    expect(totals.total).toBe(3);
    expect(totals.byDay).toHaveLength(1);
    expect(totals.byDay[0].count).toBe(3);
  });

  it("sums across days and returns byDay oldest first", async () => {
    const timerId = new mongoose.Types.ObjectId();
    const shop = "shop.myshopify.com";
    const day1 = new Date("2026-08-01T10:00:00.000Z");
    const day2 = new Date("2026-08-02T10:00:00.000Z");
    const day3 = new Date("2026-08-03T10:00:00.000Z");

    // Recorded out of order on purpose — the sort must come from the query.
    await Impression.recordImpression(timerId, shop, day3);
    await Impression.recordImpression(timerId, shop, day1);
    await Impression.recordImpression(timerId, shop, day2);
    await Impression.recordImpression(timerId, shop, day1);

    const totals = await Impression.totalsForTimer(timerId);

    expect(totals.total).toBe(4);
    expect(totals.byDay.map((row) => row.count)).toEqual([2, 1, 1]);
    expect(totals.byDay.map((row) => row.day.toISOString())).toEqual([
      "2026-08-01T00:00:00.000Z",
      "2026-08-02T00:00:00.000Z",
      "2026-08-03T00:00:00.000Z",
    ]);
  });

  it("returns a zeroed result for a timer with no impressions", async () => {
    const totals = await Impression.totalsForTimer(
      new mongoose.Types.ObjectId()
    );

    expect(totals).toEqual({ total: 0, byDay: [] });
  });

  it("counts only the requested timer", async () => {
    const timerId = new mongoose.Types.ObjectId();
    const otherTimerId = new mongoose.Types.ObjectId();
    const shop = "shop.myshopify.com";

    await Impression.recordImpression(timerId, shop);
    await Impression.recordImpression(otherTimerId, shop);
    await Impression.recordImpression(otherTimerId, shop);

    expect((await Impression.totalsForTimer(timerId)).total).toBe(1);
    expect((await Impression.totalsForTimer(otherTimerId)).total).toBe(2);
  });
});
