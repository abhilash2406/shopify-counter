import { render } from "@testing-library/react";
import { AppProvider } from "@shopify/polaris";

// Components under test render Polaris primitives (TextField, Select, ...)
// which read from Polaris's i18n context — real app translations aren't
// needed for behavior tests, Polaris falls back to its own English defaults.
export const renderWithPolaris = (ui, options) =>
  render(<AppProvider i18n={{}}>{ui}</AppProvider>, options);
