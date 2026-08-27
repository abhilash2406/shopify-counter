export default class Unauthorized extends Error {
  /** @param {string} [message] @param {string} [code] @param {number} [statusCode] @param {Record<string, unknown>} [details] */
  constructor(message = "Unauthorized", code = "UNAUTHORIZED", statusCode = 401, details) {
    super(message);
    this.name = "Unauthorized";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, Unauthorized);
    }
  }
}
