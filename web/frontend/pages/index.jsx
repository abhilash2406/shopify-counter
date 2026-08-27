import { useState } from "react";
import { Page, Layout, Banner, Modal } from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { useQuery, useQueryClient } from "react-query";
import { TimerList, TimerForm, LoadingBar } from "../components";
import { listTimers, createTimer } from "../utils/api";
import { useDisableModalBackdropClose } from "../utils/useDisableModalBackdropClose";
import { useDebouncedValue } from "../utils/useDebouncedValue";

export default function Dashboard() {
  const shopify = useAppBridge();
  const queryClient = useQueryClient();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Paging is applied by the API, so it belongs to the query key.
  const [offset, setOffset] = useState(0);
  // searchInput drives the text field instantly; search (debounced) drives the
  // query so we don't fire a request per keystroke.
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 300);
  const [sort, setSort] = useState("newest");

  useDisableModalBackdropClose(createModalOpen);

  // A new search or sort invalidates whatever page we were on. Reset during
  // render (React's recommended pattern for derived state) rather than in an
  // effect, which would fetch once at the stale offset before correcting.
  const [pageResetKey, setPageResetKey] = useState(`${search}|${sort}`);
  const nextPageResetKey = `${search}|${sort}`;
  if (nextPageResetKey !== pageResetKey) {
    setPageResetKey(nextPageResetKey);
    setOffset(0);
  }

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["timers", offset, search, sort],
    queryFn: () => listTimers({ offset, search, sort }),
    keepPreviousData: true,
  });

  const pagination = data?.pagination;

  const openCreateModal = () => {
    setError(null);
    setCreateModalOpen(true);
  };

  const handleCreate = async (values) => {
    setSaving(true);
    setError(null);
    try {
      await createTimer(values);
      await queryClient.invalidateQueries(["timers"]);
      shopify.toast.show("Timer created");
      setCreateModalOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page
      title="Countdown timers"
      primaryAction={{ content: "Create timer", onAction: openCreateModal }}
    >
      <TitleBar title="Countdown timers" />
      <Layout>
        <Layout.Section>
          {isLoading && <LoadingBar label="Loading timers…" />}
          {isError && (
            <Banner status="critical">Could not load timers. Try refreshing.</Banner>
          )}
          {data && (
            <TimerList
              timers={data.timers}
              onCreateTimer={openCreateModal}
              loading={isFetching}
              pagination={pagination}
              onNextPage={() =>
                setOffset((current) => current + (pagination?.limit ?? 10))
              }
              onPreviousPage={() =>
                setOffset((current) =>
                  Math.max(0, current - (pagination?.limit ?? 10))
                )
              }
              searchValue={searchInput}
              onSearchChange={setSearchInput}
              sortValue={sort}
              onSortChange={setSort}
            />
          )}
        </Layout.Section>
      </Layout>

      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create timer"
        large
        sectioned
      >
        {error && <Banner status="critical">{error}</Banner>}
        <TimerForm
          onSubmit={handleCreate}
          onCancel={() => setCreateModalOpen(false)}
          submitLabel="Create timer"
          saving={saving}
        />
      </Modal>
    </Page>
  );
}
