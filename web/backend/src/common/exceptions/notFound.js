export default class NotFound extends Error {
  /** @param {string} [message] @param {string} [code] @param {number} [statusCode] @param {Record<string, unknown>} [details] */
  constructor(message = "Not Found", code = "NOT_FOUND", statusCode = 404, details) {
    super(message);
    this.name = "NotFound";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NotFound);
    }
  }
}
