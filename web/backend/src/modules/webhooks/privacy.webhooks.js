import { DeliveryMethod } from "@shopify/shopify-api";
import { Timer } from "../../models/Timer.js";
import { Impression } from "../../models/Impression.js";

// Mandatory GDPR webhooks. This app never stores customer PII — only shop
// domain, timer configs, and aggregate (non-personal) impression counts — so
// the customer-scoped webhooks are legitimately no-ops. shop-redact does have
// real data to remove: the shop's timers and impression history.
//
// The explicit @type is needed so each `deliveryMethod: DeliveryMethod.Http`
// below is checked against the Http-specific handler shape instead of
// widening to the general DeliveryMethod enum, which is what index.js's
// @ts-check was flagging.
/** @type {Record<string, import("@shopify/shopify-api").WebhookHandler>} */
export default {
  /**
   * https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks#customers-data_request
   */
  CUSTOMERS_DATA_REQUEST: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async () => {
    },
  },

  /**
   * https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks#customers-redact
   */
  CUSTOMERS_REDACT: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async () => {
      // No customer data is ever stored by this app.
    },
  },

  /**
   * https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks#shop-redact
   */
  SHOP_REDACT: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (_topic, shop) => {
      const timers = await Timer.find({ shop }, { _id: 1 }).lean();
      await Impression.deleteMany({ timerId: { $in: timers.map((t) => t._id) } });
      await Timer.deleteMany({ shop });
    },
  },
};
