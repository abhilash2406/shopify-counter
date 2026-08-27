import { getTimerStatus, getEvergreenEndDate } from "../../src/utils/timerStatus.js";

describe("getTimerStatus", () => {
  const now = new Date("2026-06-15T00:00:00.000Z");

  it("returns disabled when isEnabled is false, regardless of dates", () => {
    const timer = {
      isEnabled: false,
      type: "fixed",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    };
    expect(getTimerStatus(timer, now)).toBe("disabled");
  });

  it("returns scheduled for a fixed timer that hasn't started yet", () => {
    const timer = {
      isEnabled: true,
      type: "fixed",
      startDate: "2026-07-01",
      endDate: "2026-08-01",
    };
    expect(getTimerStatus(timer, now)).toBe("scheduled");
  });

  it("returns active for a fixed timer within its date range", () => {
    const timer = {
      isEnabled: true,
      type: "fixed",
      startDate: "2026-06-01",
      endDate: "2026-07-01",
    };
    expect(getTimerStatus(timer, now)).toBe("active");
  });

  it("returns expired for a fixed timer past its end date", () => {
    const timer = {
      isEnabled: true,
      type: "fixed",
      startDate: "2026-01-01",
      endDate: "2026-06-01",
    };
    expect(getTimerStatus(timer, now)).toBe("expired");
  });

  it("evergreen timers are always active once enabled", () => {
    const timer = { isEnabled: true, type: "evergreen", durationSeconds: 900 };
    expect(getTimerStatus(timer, now)).toBe("active");
  });
});

describe("getEvergreenEndDate", () => {
  it("adds durationSeconds to the visitor's session start time", () => {
    const timer = { durationSeconds: 900 };
    const sessionStart = new Date("2026-06-15T00:00:00.000Z");
    const end = getEvergreenEndDate(timer, sessionStart);
    expect(end.toISOString()).toBe("2026-06-15T00:15:00.000Z");
  });
});
