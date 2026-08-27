// Admin endpoints answer with the { success, message, data } envelope (see
// backend src/utils/response.js). Unwrapping `data` here keeps every caller
// working with the payload directly.
const request = async (path, options = {}) => {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `Request to ${path} failed`);
  }

  if (response.status === 204) return null;

  const body = await response.json();
  return body?.success === true ? body.data : body;
};

export const TIMERS_PER_PAGE = 10;

export const listTimers = ({ offset, search, sort } = {}) => {
  const params = new URLSearchParams();
  if (offset) params.set("offset", offset);
  if (search) params.set("search", search);
  if (sort) params.set("sort", sort);
  const qs = params.toString();
  return request(`/api/timers${qs ? `?${qs}` : ""}`);
};

export const getTimer = (id) => request(`/api/timers/${id}`);

export const createTimer = (data) =>
  request("/api/timers", { method: "POST", body: JSON.stringify(data) });

export const updateTimer = (id, data) =>
  request(`/api/timers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const deleteTimer = (id) =>
  request(`/api/timers/${id}`, { method: "DELETE" });

export const getTimerAnalytics = (id) => request(`/api/analytics/${id}`);
