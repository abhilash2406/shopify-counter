import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "react-query";
import {
  ActionList,
  Button,
  Card,
  EmptyState,
  HorizontalStack,
  Popover,
  ProgressBar,
  ResourceItem,
  ResourceList,
  Spinner,
  Text,
  VerticalStack,
} from "@shopify/polaris";
import { HorizontalDotsMinor } from "@shopify/polaris-icons";
import { useAppBridge } from "@shopify/app-bridge-react";
import { StatusBadge } from "./StatusBadge";
import { deleteTimer, updateTimer } from "../utils/api";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const dayFormat = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});
const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

const isSameDay = (a, b) => a.toDateString() === b.toDateString();

/** "today at 6:05 PM" reads faster than "8/28/2026, 6:05:00 PM". */
const describeMoment = (value, now) => {
  const date = new Date(value);
  const tomorrow = new Date(now.getTime() + DAY);

  const time = timeFormat.format(date);
  if (isSameDay(date, now)) return `today at ${time}`;
  if (isSameDay(date, tomorrow)) return `tomorrow at ${time}`;
  return `${dayFormat.format(date)} at ${time}`;
};

/** Coarse by design: "2d 4h" and "3h 12m" carry more than a seconds count. */
const formatDuration = (ms) => {
  if (ms < MINUTE) return "under a minute";
  const days = Math.floor(ms / DAY);
  const hours = Math.floor((ms % DAY) / HOUR);
  const minutes = Math.floor((ms % HOUR) / MINUTE);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const describeSchedule = (timer, now) => {
  if (timer.type === "evergreen") {
    return `Resets ${Math.round(timer.durationSeconds / 60)} min after each visitor arrives`;
  }
  if (timer.status === "scheduled") {
    return `Starts ${describeMoment(timer.startDate, now)}`;
  }
  if (timer.status === "expired") {
    return `Ended ${describeMoment(timer.endDate, now)}`;
  }
  return `Ends ${describeMoment(timer.endDate, now)}`;
};

/** The headline number: what a merchant checks a countdown app to find out. */
const describeRemaining = (timer, now) => {
  if (timer.type === "evergreen" || timer.status === "disabled") return null;

  if (timer.status === "scheduled") {
    const until = new Date(timer.startDate) - now;
    return until > 0 ? { label: `in ${formatDuration(until)}`, urgent: false } : null;
  }

  if (timer.status === "active") {
    const left = new Date(timer.endDate) - now;
    if (left <= 0) return null;
    return { label: `${formatDuration(left)} left`, urgent: left < HOUR };
  }

  return null;
};

/** How far a running fixed timer has burned through its window, 0–100. */
const getProgress = (timer, now) => {
  if (timer.type !== "fixed" || timer.status !== "active") return null;
  const start = new Date(timer.startDate).getTime();
  const end = new Date(timer.endDate).getTime();
  if (!(end > start)) return null;
  const elapsed = ((now.getTime() - start) / (end - start)) * 100;
  return Math.min(100, Math.max(0, Math.round(elapsed)));
};

const describeTargeting = (timer) => {
  const { mode, resourceIds = [] } = timer.targeting || {};
  const count = resourceIds.length;
  if (mode === "products") return `${count} product${count === 1 ? "" : "s"}`;
  if (mode === "collections") {
    return `${count} collection${count === 1 ? "" : "s"}`;
  }
  return "All products";
};

/**
 * Re-renders on a slow tick so "3h 12m left" stays honest between refetches.
 * One interval for the whole list rather than one per row.
 */
const useNow = (intervalMs = 30_000) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
};

const TimerRowMenu = ({ timer, onDeleted }) => {
  const shopify = useAppBridge();
  const queryClient = useQueryClient();
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleDelete = async () => {
    setActive(false);
    setBusy(true);
    await deleteTimer(timer._id);
    await queryClient.invalidateQueries(["timers"]);
    shopify.toast.show("Timer deleted");
    onDeleted?.();
  };

  const handleToggleEnabled = async () => {
    setActive(false);
    setBusy(true);
    try {
      await updateTimer(timer._id, { isEnabled: !timer.isEnabled });
      await queryClient.invalidateQueries(["timers"]);
      shopify.toast.show(timer.isEnabled ? "Timer disabled" : "Timer enabled");
    } finally {
      setBusy(false);
    }
  };

  if (busy) {
    return (
      <div style={{ padding: "0 8px" }}>
        <Spinner size="small" accessibilityLabel="Updating timer" />
      </div>
    );
  }

  return (
    // Stop the click from bubbling to the ResourceItem's own onClick (row navigation).
    <div onClick={(event) => event.stopPropagation()}>
      <Popover
        active={active}
        onClose={() => setActive(false)}
        activator={
          <Button
            plain
            icon={HorizontalDotsMinor}
            accessibilityLabel="More actions"
            onClick={() => setActive((isActive) => !isActive)}
          />
        }
      >
        <ActionList
          items={[
            {
              content: timer.isEnabled ? "Disable" : "Enable",
              onAction: handleToggleEnabled,
            },
            { content: "Delete", destructive: true, onAction: handleDelete },
          ]}
        />
      </Popover>
    </div>
  );
};

export const TimerList = ({
  timers,
  onCreateTimer,
  loading = false,
  pagination,
  onNextPage,
  onPreviousPage,
}) => {
  const navigate = useNavigate();
  const now = useNow();

  if (!timers.length) {
    return (
      <Card>
        <EmptyState
          heading="Create your first countdown timer"
          action={{ content: "Create timer", onAction: onCreateTimer }}
          image="https://cdn.shopify.com/s/files/1/0757/9955/files/empty-state.svg"
        >
          <p>Add urgency to your product pages with a fixed or evergreen countdown.</p>
        </EmptyState>
      </Card>
    );
  }

  return (
    <Card>
      <ResourceList
        resourceName={{ singular: "timer", plural: "timers" }}
        items={timers}
        loading={loading}
        pagination={
          pagination && (pagination.hasMore || pagination.offset > 0)
            ? {
                hasNext: pagination.hasMore,
                hasPrevious: pagination.offset > 0,
                onNext: onNextPage,
                onPrevious: onPreviousPage,
                label: `${pagination.offset + 1}–${
                  pagination.offset + timers.length
                } of ${pagination.total}`,
              }
            : undefined
        }
        renderItem={(timer) => {
          const remaining = describeRemaining(timer, now);
          const progress = getProgress(timer, now);

          return (
            <ResourceItem
              id={timer._id}
              accessibilityLabel={`View details for ${timer.name}`}
              onClick={() => navigate(`/timers/${timer._id}`)}
            >
              <VerticalStack gap="2">
                <HorizontalStack align="space-between" blockAlign="start" wrap={false}>
                  <VerticalStack gap="1">
                    <Text as="h3" variant="headingSm" fontWeight="semibold">
                      {timer.name}
                    </Text>
                    <Text as="p" variant="bodySm" color="subdued">
                      {describeSchedule(timer, now)}
                    </Text>
                  </VerticalStack>

                  <HorizontalStack gap="3" blockAlign="center" wrap={false}>
                    {remaining && (
                      <Text
                        as="span"
                        variant="headingSm"
                        color={remaining.urgent ? "critical" : "subdued"}
                      >
                        {remaining.label}
                      </Text>
                    )}
                    <StatusBadge status={timer.status} />
                    <TimerRowMenu timer={timer} />
                  </HorizontalStack>
                </HorizontalStack>

                {progress !== null && (
                  <ProgressBar progress={progress} size="small" />
                )}

                <Text as="p" variant="bodySm" color="subdued">
                  {timer.type === "fixed" ? "Fixed" : "Evergreen"} ·{" "}
                  {describeTargeting(timer)}
                </Text>
              </VerticalStack>
            </ResourceItem>
          );
        }}
      />
    </Card>
  );
};
