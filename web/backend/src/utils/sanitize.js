import sanitizeHtml from "sanitize-html";

const TEXT_OPTIONS = { allowedTags: [], allowedAttributes: {} };

export function sanitizeText(value) {
  if (typeof value !== "string") return value;
  return sanitizeHtml(value, TEXT_OPTIONS).trim();
}

export function sanitizeTimerInput(input) {
  const sanitized = { ...input };

  if (sanitized.name) sanitized.name = sanitizeText(sanitized.name);

  if (sanitized.appearance) {
    sanitized.appearance = { ...sanitized.appearance };
    if (sanitized.appearance.message) {
      sanitized.appearance.message = sanitizeText(sanitized.appearance.message);
    }
    if (sanitized.appearance.expiredMessage) {
      sanitized.appearance.expiredMessage = sanitizeText(
        sanitized.appearance.expiredMessage
      );
    }
  }

  return sanitized;
}
