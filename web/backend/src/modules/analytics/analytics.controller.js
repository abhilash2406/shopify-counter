import { asyncHandler } from "../../common/asyncHandler.js";
import { goodResponse } from "../../utils/response.js";
import * as analyticsService from "./analytics.service.js";

export const getTimerAnalytics = asyncHandler(async (req, res) => {
  const analytics = await analyticsService.getTimerAnalytics(
    req.shop,
    req.params.timerId
  );
  res.json(goodResponse(analytics, "Analytics fetched successfully."));
});
