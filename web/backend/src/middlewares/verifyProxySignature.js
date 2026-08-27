import shopify from "../config/shopify.js";
import { Forbidden } from "../common/exceptions/index.js";
import { asyncHandler } from "../common/asyncHandler.js";

// Storefront requests reach these routes through Shopify's App Proxy, not an embedded  session , so we verify the proxy's HMAC signature instead of shopify.validateAuthenticatedSession(). See shopify.app.toml [app_proxy].

export const verifyProxySignature = asyncHandler(async (req, res, next) => {
  const isValid = await shopify.api.utils.validateHmac(req.query, {
    signator: "appProxy",
  });

  if (!isValid || !req.query.shop) {
    throw new Forbidden("Invalid app proxy signature");
  }

  req.shop = req.query.shop;
  next();
});
