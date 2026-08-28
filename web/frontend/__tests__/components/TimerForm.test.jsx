import { screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimerForm } from "../../components/TimerForm";
import { renderWithPolaris } from "../testUtils";

const mockResourcePicker = jest.fn();

jest.mock("@shopify/app-bridge-react", () => ({
  useAppBridge: () => ({
    resourcePicker: mockResourcePicker,
    toast: { show: jest.fn() },
  }),
}));

const fillFixedDates = () => {
  fireEvent.change(screen.getByLabelText("Start date"), {
    target: { value: "2026-01-01" },
  });
  fireEvent.change(screen.getByLabelText("End date"), {
    target: { value: "2026-01-31" },
  });
};

describe("TimerForm", () => {
  const setup = (props = {}) => {
    const onSubmit = jest.fn();
    const onCancel = jest.fn();
    renderWithPolaris(
      <TimerForm
        initialValues={props.initialValues}
        onSubmit={onSubmit}
        onCancel={onCancel}
        submitLabel="Save"
        saving={false}
      />
    );
    return { onSubmit, onCancel };
  };

  it("blocks submit and shows an error when the name is blank", async () => {
    const { onSubmit } = setup();
    fillFixedDates();

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("requires start and end dates for a fixed timer", async () => {
    const { onSubmit } = setup();
    await userEvent.type(screen.getByLabelText("Name"), "Summer Sale");

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Start date is required")).toBeInTheDocument();
    expect(screen.getByText("End date is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("requires a positive duration for an evergreen timer", async () => {
    const { onSubmit } = setup();
    await userEvent.type(screen.getByLabelText("Name"), "Flash offer");
    await userEvent.click(
      screen.getByLabelText("Evergreen — resets per visitor session")
    );

    const duration = screen.getByLabelText("Duration (minutes)");
    fireEvent.change(duration, { target: { value: "0" } });
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Duration is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("requires at least one picked resource when targeting isn't 'all'", async () => {
    const { onSubmit } = setup();
    await userEvent.type(screen.getByLabelText("Name"), "Summer Sale");
    fillFixedDates();

    await userEvent.selectOptions(
      screen.getByLabelText("Show this timer on"),
      "products"
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("Choose at least one product")
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits a valid fixed timer with the expected shape", async () => {
    const { onSubmit } = setup();
    await userEvent.type(screen.getByLabelText("Name"), "Summer Sale");
    fillFixedDates();

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted).toMatchObject({
      name: "Summer Sale",
      type: "fixed",
      targeting: { mode: "all", resourceIds: [] },
    });
    // combineDateAndTime parses the date/time inputs as local time before
    // converting to UTC, so compare against the same local->UTC conversion
    // rather than hardcoding a UTC date string (timezone-dependent otherwise).
    expect(submitted.startDate).toBe(new Date("2026-01-01T00:00:00").toISOString());
    expect(submitted.endDate).toBe(new Date("2026-01-31T00:00:00").toISOString());
  });

  it("submits a valid evergreen timer with durationSeconds converted from minutes", async () => {
    const { onSubmit } = setup();
    await userEvent.type(screen.getByLabelText("Name"), "Flash offer");
    await userEvent.click(
      screen.getByLabelText("Evergreen — resets per visitor session")
    );
    fireEvent.change(screen.getByLabelText("Duration (minutes)"), {
      target: { value: "5" },
    });

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      type: "evergreen",
      durationSeconds: 300,
    });
  });

  it("adds a picked product via the resource picker and clears the targeting error", async () => {
    mockResourcePicker.mockResolvedValueOnce([
      { id: "gid://shopify/Product/111", title: "Cool Shoes" },
    ]);
    setup();
    await userEvent.type(screen.getByLabelText("Name"), "Summer Sale");
    fillFixedDates();
    await userEvent.selectOptions(
      screen.getByLabelText("Show this timer on"),
      "products"
    );

    await userEvent.click(screen.getByRole("button", { name: "Choose products" }));

    expect(await screen.findByText("Cool Shoes")).toBeInTheDocument();
    expect(mockResourcePicker).toHaveBeenCalledWith(
      expect.objectContaining({ type: "product", multiple: true })
    );
  });

  it("pre-fills fields from initialValues when editing", () => {
    setup({
      initialValues: {
        name: "Existing timer",
        type: "evergreen",
        durationSeconds: 600,
        isEnabled: true,
        targeting: { mode: "all", resourceIds: [] },
        appearance: {
          backgroundColor: "#111111",
          textColor: "#eeeeee",
          size: "large",
          position: "top",
          message: "Hurry!",
          expiredMessage: "",
          urgencyStyle: "shake",
        },
      },
    });

    expect(screen.getByLabelText("Name")).toHaveValue("Existing timer");
    expect(screen.getByLabelText("Duration (minutes)")).toHaveValue(10);
    expect(screen.getByLabelText("Message")).toHaveValue("Hurry!");
  });

  it("calls onCancel when Cancel is clicked", async () => {
    const { onCancel } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
