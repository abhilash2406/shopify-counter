export default class TooManyRequests extends Error {
  /** @param {string} [message] @param {string} [code] @param {number} [statusCode] @param {Record<string, unknown>} [details] */
  constructor(
    message = "Too Many Requests",
    code = "TOO_MANY_REQUESTS",
    statusCode = 429,
    details
  ) {
    super(message);
    this.name = "TooManyRequests";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TooManyRequests);
    }
  }
}
