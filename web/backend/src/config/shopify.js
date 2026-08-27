import { LATEST_API_VERSION } from "@shopify/shopify-api";
import { shopifyApp } from "@shopify/shopify-app-express";
import { MongoDBSessionStorage } from "@shopify/shopify-app-session-storage-mongodb";
import { env } from "./env.js";

// No restResources: the app only talks to Shopify via the Admin GraphQL
// client (resolving product/collection titles), never the REST resource
// classes, so there's nothing to register here.
const shopify = shopifyApp({
  api: {
    apiVersion: LATEST_API_VERSION,
    future: {
      customerAddressDefaultFix: true,
      lineItemBilling: true,
      unstable_managedPricingSupport: true,
    },
    billing: undefined,
  },
  auth: {
    path: "/api/auth",
    callbackPath: "/api/auth/callback",
  },
  webhooks: {
    path: "/api/webhooks",
  },
  sessionStorage: new MongoDBSessionStorage(env.mongodbUri, env.mongodbDbName),
});

export default shopify;
