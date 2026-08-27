import rateLimit from "express-rate-limit";
import { TooManyRequests } from "../common/exceptions/index.js";

// rate limiter
export const publicRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new TooManyRequests("Too many requests, please try again shortly"));
  },
});
