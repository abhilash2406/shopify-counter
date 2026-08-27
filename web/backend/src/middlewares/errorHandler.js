import { logger } from "../config/winston.js";
import { failedResponse } from "../utils/response.js";

// Handles errors, Anything without a statusCode is treated as an unexpected bug, logged, and hidden behind a generic 500.

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err.statusCode) {
    logger.debug(`${req.method} ${req.originalUrl} → ${err.statusCode}`, {
      code: err.code,
      message: err.message,
    });
    return res
      .status(err.statusCode)
      .json(failedResponse(err.message, err.code, err.details));
  }
  logger.error(
    `Unhandled error on ${req.method} ${req.originalUrl}: ${err.message}`,
    { stack: err.stack }
  );
  return res.status(500).json(failedResponse("Internal server error"));
}
