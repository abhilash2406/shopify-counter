import { useState } from "react";
import { Page, Layout, Banner, Modal } from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { useQuery, useQueryClient } from "react-query";
import { TimerList, TimerForm, LoadingBar } from "../components";
import { listTimers, createTimer } from "../utils/api";
import { useDisableModalBackdropClose } from "../utils/useDisableModalBackdropClose";

export default function Dashboard() {
  const shopify = useAppBridge();
  const queryClient = useQueryClient();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [offset, setOffset] = useState(0);the

  useDisableModalBackdropClose(createModalOpen);

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["timers", offset],
    queryFn: () => listTimers({ offset }),
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
