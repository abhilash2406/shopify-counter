import { useState } from "react";
import {
  Button,
  ChoiceList,
  Divider,
  FormLayout,
  HorizontalStack,
  InlineError,
  Select,
  Tag,
  Text,
  TextField,
  VerticalStack,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { ColorField } from "./ColorField";

const SIZE_OPTIONS = [
  { label: "Small", value: "small" },
  { label: "Medium", value: "medium" },
  { label: "Large", value: "large" },
];

const POSITION_OPTIONS = [
  { label: "Inline (where the block is placed)", value: "inline" },
  { label: "Top", value: "top" },
  { label: "Bottom", value: "bottom" },
];

const URGENCY_OPTIONS = [
  { label: "None", value: "none" },
  { label: "Color pulse", value: "pulse" },
  { label: "Shake", value: "shake" },
  { label: "Flash", value: "flash" },
];

// Date/time inputs are edited in the browser's local time zone, so reading
// and writing them both go through local getters/constructors — mixing in
// toISOString() (UTC) here would silently shift times on every re-save.
const toDateInputValue = (isoString) => {
  if (!isoString) return "";
  const d = new Date(isoString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const toTimeInputValue = (isoString) => {
  if (!isoString) return "00:00";
  const d = new Date(isoString);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const combineDateAndTime = (date, time) =>
  new Date(`${date}T${time || "00:00"}:00`).toISOString();

const SectionHeading = ({ children }) => (
  <Text as="h2" variant="headingSm" color="subdued">
    {children.toUpperCase()}
  </Text>
);

export const TimerForm = ({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel,
  saving,
}) => {
  const shopify = useAppBridge();
  const [name, setName] = useState(initialValues?.name || "");
  const [type, setType] = useState(initialValues?.type || "fixed");
  // Not editable here — new timers are always created enabled, and existing
  // ones are enabled/disabled via the quick action in the timer list instead.
  const isEnabled = initialValues?.isEnabled ?? true;
  const [startDate, setStartDate] = useState(
    toDateInputValue(initialValues?.startDate)
  );
  const [startTime, setStartTime] = useState(
    toTimeInputValue(initialValues?.startDate)
  );
  const [endDate, setEndDate] = useState(
    toDateInputValue(initialValues?.endDate)
  );
  const [endTime, setEndTime] = useState(
    toTimeInputValue(initialValues?.endDate)
  );
  const [durationMinutes, setDurationMinutes] = useState(
    initialValues?.durationSeconds
      ? String(initialValues.durationSeconds / 60)
      : "15"
  );

  const [targetingMode, setTargetingMode] = useState(
    initialValues?.targeting?.mode || "all"
  );
  const [resources, setResources] = useState(
    initialValues?.targeting?.resources || []
  );

  const [backgroundColor, setBackgroundColor] = useState(
    initialValues?.appearance?.backgroundColor || "#1a1a1a"
  );
  const [textColor, setTextColor] = useState(
    initialValues?.appearance?.textColor || "#ffffff"
  );
  const [size, setSize] = useState(initialValues?.appearance?.size || "medium");
  const [position, setPosition] = useState(
    initialValues?.appearance?.position || "inline"
  );
  const [message, setMessage] = useState(
    initialValues?.appearance?.message || "Offer ends in:"
  );
  const [expiredMessage, setExpiredMessage] = useState(
    initialValues?.appearance?.expiredMessage || ""
  );
  const [urgencyStyle, setUrgencyStyle] = useState(
    initialValues?.appearance?.urgencyStyle || "pulse"
  );

  const [errors, setErrors] = useState({});

  const clearError = (key) => {
    setErrors((current) => {
      if (!current[key]) return current;
      const { [key]: _removed, ...rest } = current;
      return rest;
    });
  };

  const validate = () => {
    const nextErrors = {};

    if (!name.trim()) {
      nextErrors.name = "Name is required";
    }

    if (type === "fixed") {
      if (!startDate) nextErrors.startDate = "Start date is required";
      if (!endDate) nextErrors.endDate = "End date is required";
    } else if (!durationMinutes || Number(durationMinutes) <= 0) {
      nextErrors.durationMinutes = "Duration is required";
    }

    if (targetingMode !== "all" && resources.length === 0) {
      nextErrors.resources =
        targetingMode === "collections"
          ? "Choose at least one collection"
          : "Choose at least one product";
    }

    return nextErrors;
  };

  const handlePickResources = async () => {
    const gidType = targetingMode === "collections" ? "Collection" : "Product";
    const result = await shopify.resourcePicker({
      type: targetingMode === "collections" ? "collection" : "product",
      multiple: true,
      selectionIds: resources.map((resource) => ({
        id: resource.gid || `gid://shopify/${gidType}/${resource.id}`,
      })),
    });

    if (result) {
      // Theme Liquid only exposes numeric product/collection IDs (no GIDs),
      // so targeting is matched on the numeric ID; we keep the GID around
      // only to re-open the picker with the current selection pre-checked.
      setResources(
        result.map((resource) => ({
          id: resource.id.split("/").pop(),
          gid: resource.id,
          title: resource.title,
        }))
      );
      clearError("resources");
    }
  };

  const removeResource = (id) => {
    setResources((current) => current.filter((resource) => resource.id !== id));
  };

  const handleSubmit = () => {
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});

    onSubmit({
      name,
      type,
      isEnabled,
      startDate: type === "fixed" ? combineDateAndTime(startDate, startTime) : undefined,
      endDate: type === "fixed" ? combineDateAndTime(endDate, endTime) : undefined,
      durationSeconds:
        type === "evergreen" ? Number(durationMinutes) * 60 : undefined,
      targeting: {
        mode: targetingMode,
        resourceIds: resources.map((resource) => resource.id),
        resources,
      },
      appearance: {
        backgroundColor,
        textColor,
        size,
        position,
        message,
        expiredMessage,
        urgencyStyle,
      },
    });
  };

  return (
    <VerticalStack gap="5">
      <VerticalStack gap="4">
        <SectionHeading>Timer details</SectionHeading>
        <FormLayout>
          <TextField
            label="Name"
            value={name}
            onChange={(value) => {
              setName(value);
              clearError("name");
            }}
            autoComplete="off"
            helpText="Internal name shown only in this dashboard."
            error={errors.name}
          />
          <ChoiceList
            title="Timer type"
            selected={[type]}
            onChange={([value]) => {
              setType(value);
              setErrors((current) => {
                const { startDate: _s, endDate: _e, durationMinutes: _d, ...rest } = current;
                return rest;
              });
            }}
            choices={[
              {
                label: "Fixed — runs between a start and end date",
                value: "fixed",
              },
              {
                label: "Evergreen — resets per visitor session",
                value: "evergreen",
              },
            ]}
          />

          {type === "fixed" ? (
            <VerticalStack gap="4">
              <FormLayout.Group>
                <TextField
                  label="Start date"
                  type="date"
                  value={startDate}
                  onChange={(value) => {
                    setStartDate(value);
                    clearError("startDate");
                  }}
                  autoComplete="off"
                  error={errors.startDate}
                />
                <TextField
                  label="Start time"
                  type="time"
                  value={startTime}
                  onChange={setStartTime}
                  autoComplete="off"
                />
              </FormLayout.Group>
              <FormLayout.Group>
                <TextField
                  label="End date"
                  type="date"
                  value={endDate}
                  onChange={(value) => {
                    setEndDate(value);
                    clearError("endDate");
                  }}
                  autoComplete="off"
                  error={errors.endDate}
                />
                <TextField
                  label="End time"
                  type="time"
                  value={endTime}
                  onChange={setEndTime}
                  autoComplete="off"
                />
              </FormLayout.Group>
            </VerticalStack>
          ) : (
            <TextField
              label="Duration (minutes)"
              type="number"
              min={1}
              value={durationMinutes}
              onChange={(value) => {
                setDurationMinutes(value);
                clearError("durationMinutes");
              }}
              autoComplete="off"
              helpText="Countdown length for each new visitor, starting from their first view."
              error={errors.durationMinutes}
            />
          )}
        </FormLayout>
      </VerticalStack>

      <Divider />

      <VerticalStack gap="4">
        <SectionHeading>Targeting</SectionHeading>
        <FormLayout>
          <Select
            label="Show this timer on"
            value={targetingMode}
            onChange={(value) => {
              setTargetingMode(value);
              setResources([]);
              clearError("resources");
            }}
            options={[
              { label: "All products", value: "all" },
              { label: "Specific products", value: "products" },
              { label: "Specific collections", value: "collections" },
            ]}
          />

          {targetingMode !== "all" && (
            <VerticalStack gap="2">
              <Button onClick={handlePickResources}>
                {targetingMode === "collections"
                  ? "Choose collections"
                  : "Choose products"}
              </Button>
              <HorizontalStack gap="1">
                {resources.map((resource) => (
                  <Tag key={resource.id} onRemove={() => removeResource(resource.id)}>
                    {resource.title}
                  </Tag>
                ))}
              </HorizontalStack>
              {errors.resources && <InlineError message={errors.resources} fieldID="resources" />}
            </VerticalStack>
          )}
        </FormLayout>
      </VerticalStack>

      <Divider />

      <VerticalStack gap="4">
        <SectionHeading>Appearance</SectionHeading>
        <FormLayout>
          <FormLayout.Group>
            <ColorField
              label="Background color"
              value={backgroundColor}
              onChange={setBackgroundColor}
              helpText="Hex color, e.g. #1a1a1a"
            />
            <ColorField
              label="Text color"
              value={textColor}
              onChange={setTextColor}
              helpText="Hex color, e.g. #ffffff"
            />
          </FormLayout.Group>
          <FormLayout.Group>
            <Select
              label="Timer size"
              value={size}
              onChange={setSize}
              options={SIZE_OPTIONS}
            />
            <Select
              label="Timer position"
              value={position}
              onChange={setPosition}
              options={POSITION_OPTIONS}
            />
          </FormLayout.Group>
          <TextField
            label="Message"
            value={message}
            onChange={setMessage}
            autoComplete="off"
            helpText="Shown above the countdown, e.g. 'Sale ends in:'"
          />
          <TextField
            label="Expired message"
            value={expiredMessage}
            onChange={setExpiredMessage}
            autoComplete="off"
            helpText="Optional message shown after a fixed timer expires. Leave blank to hide the widget instead."
          />
          <Select
            label="Urgency notification"
            value={urgencyStyle}
            onChange={setUrgencyStyle}
            options={URGENCY_OPTIONS}
            helpText="Visual cue applied in the final 5 minutes before the timer ends."
          />
        </FormLayout>
      </VerticalStack>

      <Divider />

      <HorizontalStack align="end" gap="2">
        {onCancel && <Button onClick={onCancel}>Cancel</Button>}
        <Button primary onClick={handleSubmit} loading={saving}>
          {submitLabel}
        </Button>
      </HorizontalStack>
    </VerticalStack>
  );
};
