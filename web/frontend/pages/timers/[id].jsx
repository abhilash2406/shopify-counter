import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Page, Layout, Banner, Card, Text, VerticalStack } from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { useQuery } from "react-query";
import { TimerForm, LoadingBar } from "../../components";
import { getTimer, updateTimer, getTimerAnalytics } from "../../utils/api";

export default function EditTimer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["timer", id],
    queryFn: () => getTimer(id),
  });

  const { data: analytics } = useQuery({
    queryKey: ["analytics", id],
    queryFn: () => getTimerAnalytics(id),
    enabled: Boolean(data),
  });

  const handleSubmit = async (values) => {
    setSaving(true);
    setError(null);
    try {
      await updateTimer(id, {
        ...values,
        expectedUpdatedAt: data.timer.updatedAt,
      });
      shopify.toast.show("Timer updated");
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const goToList = () => navigate("/");

  if (isLoading || !data) {
    return (
      <Page title="Edit timer" backAction={{ onAction: goToList }}>
        <TitleBar title="Edit timer" />
        <LoadingBar label="Loading timer…" />
      </Page>
    );
  }

  return (
    <Page title="Edit timer" backAction={{ onAction: goToList }}>
      <TitleBar title="Edit timer" />
      <Layout>
        <Layout.Section>
          <VerticalStack gap="4">
            {error && <Banner status="critical">{error}</Banner>}
            <Card>
              <Text as="h2" variant="headingMd">
                Impressions
              </Text>
              <Text as="p" variant="heading2xl">
                {analytics ? analytics.total : "–"}
              </Text>
            </Card>
            <Card sectioned>
              <TimerForm
                initialValues={data.timer}
                onSubmit={handleSubmit}
                onCancel={goToList}
                submitLabel="Save changes"
                saving={saving}
              />
            </Card>
          </VerticalStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
