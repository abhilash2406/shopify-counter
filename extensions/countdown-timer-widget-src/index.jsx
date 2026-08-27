import { h, render } from "preact";
import { useEffect, useState } from "preact/hooks";

const PROXY_BASE = "/apps/countdown-timer";
const EVERGREEN_STORAGE_PREFIX = "countdown-timer-evergreen-";
const URGENT_THRESHOLD_MS = 5 * 60 * 1000;

function pad(value) {
  return String(value).padStart(2, "0");
}

function splitDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function getEvergreenStart(timerId) {
  const key = EVERGREEN_STORAGE_PREFIX + timerId;
  try {
    const stored = window.localStorage.getItem(key);
    if (stored) return Number(stored);
    const now = Date.now();
    window.localStorage.setItem(key, String(now));
    return now;
  } catch {
    // localStorage unavailable (private mode, disabled) — fall back to a
    // session-only countdown rather than breaking the widget.
    return Date.now();
  }
}

function getEndTime(config) {
  if (config.type === "evergreen") {
    return getEvergreenStart(config.id) + config.durationSeconds * 1000;
  }
  return new Date(config.endDate).getTime();
}

function widgetClassName(config, extra = "") {
  const { size = "medium", position = "inline" } = config.appearance;
  return [
    "countdown-timer-widget",
    `countdown-timer-widget--size-${size}`,
    position !== "inline" ? `countdown-timer-widget--pos-${position}` : "",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

function Countdown({ config }) {
  const [remaining, setRemaining] = useState(() => getEndTime(config) - Date.now());

  useEffect(() => {
    const endTime = getEndTime(config);
    const tick = () => setRemaining(endTime - Date.now());
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [config]);

  if (remaining <= 0) {
    if (!config.appearance.expiredMessage) return null;
    return (
      <div
        class={widgetClassName(config)}
        style={{
          background: config.appearance.backgroundColor,
          color: config.appearance.textColor,
        }}
      >
        <span class="countdown-timer-widget__message">
          {config.appearance.expiredMessage}
        </span>
      </div>
    );
  }

  const { days, hours, minutes, seconds } = splitDuration(remaining);
  const urgent = remaining < URGENT_THRESHOLD_MS;
  const urgencyStyle = config.appearance.urgencyStyle || "pulse";
  const urgencyClass =
    urgent && urgencyStyle !== "none"
      ? `countdown-timer-widget--urgency-${urgencyStyle}`
      : "";

  return (
    <div
      class={widgetClassName(config, urgencyClass)}
      style={{
        background: config.appearance.backgroundColor,
        color: config.appearance.textColor,
      }}
    >
      <span class="countdown-timer-widget__message">
        {config.appearance.message}
      </span>
      <span class="countdown-timer-widget__time">
        {days > 0 ? `${days}d ` : ""}
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    </div>
  );
}

function logImpression(timerId) {
  fetch(`${PROXY_BASE}/impression`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ timerId }),
    keepalive: true,
  }).catch(() => {
    // Never let analytics failures affect the storefront.
  });
}

async function mount(root) {
  const { productId, collectionId } = root.dataset;

  try {
    const params = new URLSearchParams();
    if (productId) params.set("productId", productId);
    if (collectionId) params.set("collectionId", collectionId);

    const response = await fetch(`${PROXY_BASE}/timer-config?${params.toString()}`);
    if (!response.ok || response.status === 204) return;

    const config = await response.json();
    if (!config || !config.id) return;

    render(<Countdown config={config} />, root);
    logImpression(config.id);
  } catch {
    // Graceful degradation: a failed fetch should never break the storefront.
  }
}

document.querySelectorAll("[data-countdown-timer-widget]").forEach(mount);
