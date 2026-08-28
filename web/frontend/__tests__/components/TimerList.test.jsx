import { render, screen, waitFor } from "@testing-library/react";
import { AppProvider } from "@shopify/polaris";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "react-query";
import { TimerList } from "../../components/TimerList";
import { deleteTimer, updateTimer } from "../../utils/api";

const mockNavigate = jest.fn();
const mockToastShow = jest.fn();

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock("@shopify/app-bridge-react", () => ({
  useAppBridge: () => ({ toast: { show: mockToastShow } }),
}));

jest.mock("../../utils/api", () => ({
  deleteTimer: jest.fn(),
  updateTimer: jest.fn(),
}));

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const baseTimer = (overrides = {}) => ({
  _id: "timer-1",
  name: "Summer Sale",
  type: "fixed",
  status: "active",
  isEnabled: true,
  startDate: new Date(Date.now() - DAY).toISOString(),
  endDate: new Date(Date.now() + DAY).toISOString(),
  targeting: { mode: "all", resourceIds: [] },
  ...overrides,
});

const renderWithClient = (ui) => {
  const queryClient = new QueryClient();
  jest.spyOn(queryClient, "invalidateQueries");
  const utils = render(
    <AppProvider i18n={{}}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </AppProvider>
  );
  return { ...utils, queryClient };
};

describe("TimerList", () => {
  it("shows the full-page empty state only when there are no timers at all", () => {
    const onCreateTimer = jest.fn();
    renderWithClient(
      <TimerList timers={[]} pagination={{ total: 0 }} onCreateTimer={onCreateTimer} />
    );

    expect(
      screen.getByText("Create your first countdown timer")
    ).toBeInTheDocument();
  });

  it("falls through to the list's own empty-search state when filtered", () => {
    renderWithClient(
      <TimerList
        timers={[]}
        pagination={{ total: 5 }}
        searchValue="nothing-matches"
        onSearchChange={jest.fn()}
      />
    );

    expect(
      screen.queryByText("Create your first countdown timer")
    ).not.toBeInTheDocument();
  });

  it("renders a timer row with its name, status, type and targeting", () => {
    renderWithClient(
      <TimerList timers={[baseTimer()]} pagination={{ total: 1, offset: 0 }} />
    );

    expect(screen.getByText("Summer Sale")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText(/Fixed/)).toBeInTheDocument();
    expect(screen.getByText(/All products/)).toBeInTheDocument();
  });

  it("describes an evergreen timer's schedule by its duration, not fixed dates", () => {
    renderWithClient(
      <TimerList
        timers={[
          baseTimer({
            type: "evergreen",
            durationSeconds: 900,
            startDate: undefined,
            endDate: undefined,
          }),
        ]}
        pagination={{ total: 1, offset: 0 }}
      />
    );

    expect(
      screen.getByText("Resets 15 min after each visitor arrives")
    ).toBeInTheDocument();
  });

  it("navigates to the timer's detail page when a row is clicked", async () => {
    renderWithClient(
      <TimerList timers={[baseTimer()]} pagination={{ total: 1, offset: 0 }} />
    );

    await userEvent.click(screen.getByText("Summer Sale"));

    expect(mockNavigate).toHaveBeenCalledWith("/timers/timer-1");
  });

  it("deletes a timer from its row menu and refreshes the list", async () => {
    deleteTimer.mockResolvedValueOnce(undefined);
    const { queryClient } = renderWithClient(
      <TimerList timers={[baseTimer()]} pagination={{ total: 1, offset: 0 }} />
    );

    await userEvent.click(screen.getByRole("button", { name: "More actions" }));
    await userEvent.click(await screen.findByText("Delete"));

    await waitFor(() => expect(deleteTimer).toHaveBeenCalledWith("timer-1"));
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(["timers"]);
    expect(mockToastShow).toHaveBeenCalledWith("Timer deleted");
  });

  it("disables an enabled timer from its row menu", async () => {
    updateTimer.mockResolvedValueOnce(undefined);
    renderWithClient(
      <TimerList timers={[baseTimer({ isEnabled: true })]} pagination={{ total: 1, offset: 0 }} />
    );

    await userEvent.click(screen.getByRole("button", { name: "More actions" }));
    await userEvent.click(await screen.findByText("Disable"));

    await waitFor(() =>
      expect(updateTimer).toHaveBeenCalledWith("timer-1", { isEnabled: false })
    );
    expect(mockToastShow).toHaveBeenCalledWith("Timer disabled");
  });

  it("does not offer Disable/Enable for an already-expired timer", async () => {
    renderWithClient(
      <TimerList
        timers={[baseTimer({ status: "expired" })]}
        pagination={{ total: 1, offset: 0 }}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "More actions" }));

    expect(screen.queryByText("Disable")).not.toBeInTheDocument();
    expect(screen.queryByText("Enable")).not.toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("fires onSearchChange as the merchant types in the search field", async () => {
    const onSearchChange = jest.fn();
    renderWithClient(
      <TimerList
        timers={[baseTimer()]}
        pagination={{ total: 1, offset: 0 }}
        searchValue=""
        onSearchChange={onSearchChange}
      />
    );

    await userEvent.type(screen.getByPlaceholderText("Search timers by name"), "sum");

    expect(onSearchChange).toHaveBeenCalled();
  });
});
