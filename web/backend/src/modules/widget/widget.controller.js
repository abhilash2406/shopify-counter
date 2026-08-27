import { asyncHandler } from "../../common/asyncHandler.js";
import * as widgetService from "./widget.service.js";

// A product page sends every collection it belongs to. The cap bounds the
// `$in` the list feeds, so a crafted query string can't widen the query.
const MAX_COLLECTION_IDS = 50;

const parseCollectionIds = (raw) =>
  String(raw ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, MAX_COLLECTION_IDS);

export const getTimerConfig = asyncHandler(async (req, res) => {
  const { productId, collectionId, collectionIds } = req.query;
  const config = await widgetService.getPublicTimerConfig(req.shop, {
    productId,
    collectionIds: parseCollectionIds(collectionIds ?? collectionId),
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
