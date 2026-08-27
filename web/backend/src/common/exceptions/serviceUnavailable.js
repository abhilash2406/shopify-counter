export default class ServiceUnavailable extends Error {
  /** @param {string} [message] @param {string} [code] @param {number} [statusCode] @param {Record<string, unknown>} [details] */
  constructor(
    message = "Service Unavailable",
    code = "SERVICE_UNAVAILABLE",
    statusCode = 503,
    details
  ) {
    super(message);
    this.name = "ServiceUnavailable";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ServiceUnavailable);
    }
  }
}
