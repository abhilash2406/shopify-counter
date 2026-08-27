import { asyncHandler } from "../../common/asyncHandler.js";
import * as widgetService from "./widget.service.js";

export const getTimerConfig = asyncHandler(async (req, res) => {
  const { productId, collectionId } = req.query;
  const config = await widgetService.getPublicTimerConfig(req.shop, {
    productId,
    collectionId,
  });

  // Short cache window: safe because the response is a timer's static definition, not a per-visitor countdown value (evergreen remaining time is computed client-side from localStorage).
  res.set("Cache-Control", "public, max-age=30");

  if (!config) return res.status(204).end();
  res.json(config);
});

export const logImpression = asyncHandler(async (req, res) => {
  await widgetService.logImpression(req.shop, req.body.timerId);
  res.status(204).end();
});
