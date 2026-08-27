// Runs after shopify.validateAuthenticatedSession(), which verifies the embedded-admin session and populates res.locals.shopify.session from where we get shop

export function attachShop(req, res, next) {
  req.shop = res.locals.shopify.session.shop;
  next();
}
