import { Badge } from "@shopify/polaris";

const BADGE_STATUS = {
  active: "success",
  scheduled: "info",
  expired: "critical",
  disabled: undefined,
};

const STATUS_LABEL = {
  active: "Active",
  scheduled: "Scheduled",
  expired: "Expired",
  disabled: "Disabled",
};

export const StatusBadge = ({ status }) => (
  <Badge status={BADGE_STATUS[status]}>{STATUS_LABEL[status] || status}</Badge>
);
