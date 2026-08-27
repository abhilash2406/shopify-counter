import { Timer } from "../../models/Timer.js";
import { NotFound } from "../../common/exceptions/index.js";
import { sanitizeTimerInput } from "../../utils/sanitize.js";
import { getTimerStatus } from "../../utils/timerStatus.js";
import { matchesTargeting, toCollectionList } from "../../utils/targeting.js";
import { TIMER_PAGE_SIZE, validateTimerInput } from "./timer.validation.js";

/**
 * One page of the shop's timers, plus the totals a pager needs.
 * @returns {Promise<{ timers: object[], pagination: { total: number, limit: number, offset: number, hasMore: boolean } }>}
 */
export const listTimers = async (
  shop,
  { limit = TIMER_PAGE_SIZE, offset = 0 } = {}
) => {
  const filter = { shop };

  const [rows, total] = await Promise.all([
    Timer.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
    Timer.countDocuments(filter),
  ]);

  const now = new Date();
  return {
    timers: rows.map((timer) => ({
      ...timer,
      status: getTimerStatus(timer, now),
    })),
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + rows.length < total,
    },
  };
};
// fetch timer
export const getTimer = async (shop, id) => {
  const timer = await Timer.findOne({ _id: id, shop });
  if (!timer) throw new NotFound("Timer not found");
  return timer;
};

// create timer

export const createTimer = async (shop, input) => {
  validateTimerInput(input);
  const sanitized = sanitizeTimerInput(input);
  return Timer.create({ ...sanitized, shop });
};


// edit timer
export const updateTimer = async (shop, id, input) => {
  const timer = await getTimer(shop, id);
  const merged = { ...timer.toObject(), ...input };
  validateTimerInput(merged);

  const sanitized = sanitizeTimerInput(input);
  Object.assign(timer, sanitized);
  await timer.save();
  return timer;
};


// to delete a existing timer
export const deleteTimer = async (shop, id) => {
  const result = await Timer.deleteOne({ _id: id, shop });
  if (result.deletedCount === 0) throw new NotFound("Timer not found");
};

export const findApplicableTimer = async (
  shop,
  { productId, collectionId, collectionIds } = {}
) => {
  const now = new Date();
  const collections = toCollectionList(collectionId, collectionIds);

  const targetingOr = [{ "targeting.mode": "all" }];
  if (productId) {
    targetingOr.push({
      "targeting.mode": "products",
      "targeting.resourceIds": productId,
    });
  }
  if (collections.length) {
    targetingOr.push({
      "targeting.mode": "collections",
      "targeting.resourceIds": { $in: collections },
    });
  }

  const candidates = await Timer.find({
    shop,
    isEnabled: true,
    $or: targetingOr,
  }).lean();

  const active = candidates.filter(
    (timer) =>
      getTimerStatus(timer, now) === "active" &&
      matchesTargeting(timer, { productId, collectionIds: collections })
  );

  if (!active.length) return null;

  const priority = { products: 0, collections: 1, all: 2 };
  active.sort(
    (a, b) => priority[a.targeting.mode] - priority[b.targeting.mode]
  );

  return active[0];
};
