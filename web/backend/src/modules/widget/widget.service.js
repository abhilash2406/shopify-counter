import mongoose from "mongoose";
import { Timer } from "../../models/Timer.js";
import { Impression } from "../../models/Impression.js";
import { findApplicableTimer } from "../timers/timer.service.js";

export const getPublicTimerConfig = async (
  shop,
  { productId, collectionId }
) => {
  const timer = await findApplicableTimer(shop, { productId, collectionId });
  if (!timer) return null;

  return {
    id: timer._id,
    type: timer.type,
    startDate: timer.startDate,
    endDate: timer.endDate,
    durationSeconds: timer.durationSeconds,
    appearance: timer.appearance,
  };
};

export const logImpression = async (shop, timerId) => {
  if (!timerId || !mongoose.isValidObjectId(timerId)) return;

  const belongsToShop = await Timer.exists({ _id: timerId, shop });
  if (!belongsToShop) return;

  await Impression.recordImpression(timerId, shop);
};
