export default class Conflict extends Error {
  /** @param {string} [message] @param {string} [code] @param {number} [statusCode] @param {Record<string, unknown>} [details] */
  constructor(message = "Conflict", code = "CONFLICT", statusCode = 409, details) {
    super(message);
    this.name = "Conflict";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, Conflict);
    }
  }
}
