import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "react-query";
import {
  ActionList,
  Button,
  Card,
  EmptyState,
  HorizontalStack,
  Popover,
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

const TARGETING_LABEL = {
  all: "All products",
  products: "Specific products",
  collections: "Specific collections",
};

const formatSchedule = (timer) => {
  if (timer.type === "evergreen") {
    return `Resets ${Math.round(timer.durationSeconds / 60)} min per visitor`;
  }
  const start = new Date(timer.startDate).toLocaleString();
  const end = new Date(timer.endDate).toLocaleString();
  return `${start} – ${end}`;
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
        renderItem={(timer) => (
          <ResourceItem
            id={timer._id}
            accessibilityLabel={`View details for ${timer.name}`}
            onClick={() => navigate(`/timers/${timer._id}`)}
          >
            <HorizontalStack align="space-between" blockAlign="start" wrap={false}>
              <VerticalStack gap="1">
                <Text as="h3" fontWeight="bold">
                  {timer.name}
                </Text>
                <Text as="p" color="subdued">
                  {timer.type === "fixed" ? "Fixed" : "Evergreen"} ·{" "}
                  {TARGETING_LABEL[timer.targeting.mode]}
                </Text>
                <Text as="p" color="subdued">
                  {formatSchedule(timer)}
                </Text>
              </VerticalStack>
              <HorizontalStack gap="4" blockAlign="center" wrap={false}>
                <StatusBadge status={timer.status} />
                <TimerRowMenu timer={timer} />
              </HorizontalStack>
            </HorizontalStack>
          </ResourceItem>
        )}
      />
    </Card>
  );
};
