export function getTimerStatus(timer, now = new Date()) {
  if (!timer.isEnabled) return "disabled";
  if (timer.type === "evergreen") return "active";
  if (timer.startDate && now < new Date(timer.startDate)) return "scheduled";
  if (timer.endDate && now >= new Date(timer.endDate)) return "expired";
  return "active";
}

export function getEvergreenEndDate(timer, sessionStartedAt) {
  return new Date(
    new Date(sessionStartedAt).getTime() + timer.durationSeconds * 1000
  );
}
