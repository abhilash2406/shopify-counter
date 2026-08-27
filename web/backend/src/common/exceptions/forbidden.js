export default class Forbidden extends Error {
  /** @param {string} [message] @param {string} [code] @param {number} [statusCode] @param {Record<string, unknown>} [details] */
  constructor(message = "Forbidden", code = "FORBIDDEN", statusCode = 403, details) {
    super(message);
    this.name = "Forbidden";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, Forbidden);
    }
  }
}
