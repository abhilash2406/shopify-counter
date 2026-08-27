import { useAppBridge } from '@shopify/app-bridge-react';
import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Banner, Layout, Page } from '@shopify/polaris';

export default function ExitIframe() {
  const app = useAppBridge();
  const { search } = useLocation();

  // A malformed or absent redirectUri used to throw inside the effect; it now
  // resolves to null, which renders nothing rather than crashing the page.
  const redirectUrl = useMemo(() => {
    if (!search) return null;
    const redirectUri = new URLSearchParams(search).get('redirectUri');
    if (!redirectUri) return null;
    try {
      return new URL(decodeURIComponent(redirectUri));
    } catch {
      return null;
    }
  }, [search]);

  // Whether the target is allowed is a pure function of the URL, so it is
  // derived during render instead of being pushed into state from the effect.
  const isAllowed =
    !!redirectUrl &&
    ([location.hostname, 'admin.shopify.com'].includes(redirectUrl.hostname) ||
      redirectUrl.hostname.endsWith('.myshopify.com'));

  const showWarning = !!redirectUrl && !isAllowed;

  app.loading(true);

  // Only the navigation itself is a side effect.
  useEffect(() => {
    if (app && isAllowed) {
      window.open(redirectUrl, '_top');
    }
  }, [app, isAllowed, redirectUrl]);

  return showWarning ? (
    <Page narrowWidth>
      <Layout>
        <Layout.Section>
          <div style={{ marginTop: '100px' }}>
            <Banner title="Redirecting outside of Shopify" status="warning">
              Apps can only use /exitiframe to reach Shopify or the app itself.
            </Banner>
          </div>
        </Layout.Section>
      </Layout>
    </Page>
  ) : null;
}
