/**
 * Standard response envelopes.
 *
 * Every admin endpoint answers with the same three keys so the client never
 * has to guess where the payload lives, and `success` is checkable without
 * inspecting the HTTP status. Errors mirror the same shape.
 *
 * The storefront (`/api/public/*`) endpoints deliberately do NOT use
 * `goodResponse` — their success bodies are consumed by the widget bundle
 * already deployed in merchant themes, so that shape is a published contract
 * we cannot rewrite from the server alone. Errors are enveloped everywhere,
 * since the widget never reads an error body.
 */

export function goodResponse(data, message = "Success") {
  return { success: true, message, data };
}

export function failedResponse(message, code, details) {
  return {
    success: false,
    message,
    ...(code ? { code } : {}),
    ...(details ? { details } : {}),
  };
}
