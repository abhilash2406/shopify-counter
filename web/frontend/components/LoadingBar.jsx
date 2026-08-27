import { Text } from "@shopify/polaris";


//loader
export const LoadingBar = ({ label = "Loading" }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "12px",
      padding: "80px 24px",
    }}
  >
    <div className="timer-loading-bar-track">
      <div className="timer-loading-bar-fill" />
    </div>
    <Text as="p" color="subdued">
      {label}
    </Text>
  </div>
);
