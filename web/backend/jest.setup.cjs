// config/shopify.js calls shopifyApp({...}) at import time, which reads
// these straight from process.env and throws if they're missing. Real
// values only exist when running under `shopify app dev`; tests never make
// a real Shopify API call through this client (targeting.mode "all" skips
// the Admin GraphQL lookup, and verifyProxySignature is mocked where it
// matters), so placeholders are enough to let the module initialize.
process.env.SHOPIFY_API_KEY ??= "test_api_key";
process.env.SHOPIFY_API_SECRET ??= "test_api_secret";
process.env.SCOPES ??= "read_products";
process.env.HOST ??= "example.com";
