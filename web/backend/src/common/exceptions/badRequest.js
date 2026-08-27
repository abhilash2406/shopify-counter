export default class BadRequest extends Error {
  /** @param {string} [message] @param {string} [code] @param {number} [statusCode] @param {Record<string, unknown>} [details] */
  constructor(message = "Bad Request", code = "BAD_REQUEST", statusCode = 400, details) {
    super(message);
    this.name = "BadRequest";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BadRequest);
    }
  }
}
