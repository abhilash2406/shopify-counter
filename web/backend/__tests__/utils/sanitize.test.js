import { sanitizeTimerInput } from "../../src/utils/sanitize.js";

describe("sanitizeTimerInput", () => {
  it("strips script tags and HTML from user-supplied text fields", () => {
    const input = {
      name: '<script>alert("xss")</script>Summer sale',
      appearance: {
        message: "<b>Hurry</b> ends soon",
        expiredMessage: '<img src=x onerror=alert(1)>Sale over',
      },
    };

    const sanitized = sanitizeTimerInput(input);

    expect(sanitized.name).toBe("Summer sale");
    expect(sanitized.appearance.message).toBe("Hurry ends soon");
    expect(sanitized.appearance.expiredMessage).toBe("Sale over");
  });

  it("leaves fields it doesn't touch unchanged", () => {
    const input = { type: "fixed", durationSeconds: 900 };
    expect(sanitizeTimerInput(input)).toEqual(input);
  });
});
