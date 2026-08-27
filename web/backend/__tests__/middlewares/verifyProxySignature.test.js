jest.mock("../../src/config/shopify.js", () => ({
  __esModule: true,
  default: {
    api: { utils: { validateHmac: jest.fn() } },
  },
}));

import express from "express";
import request from "supertest";
import shopify from "../../src/config/shopify.js";
import { verifyProxySignature } from "../../src/middlewares/verifyProxySignature.js";
import { errorHandler } from "../../src/middlewares/errorHandler.js";

function buildApp() {
  const app = express();
  app.use(verifyProxySignature);
  app.get("/whoami", (req, res) => res.json({ shop: req.shop }));
  app.use(errorHandler);
  return app;
}

describe("verifyProxySignature middleware", () => {
  it("sets req.shop from a validly-signed proxy request", async () => {
    shopify.api.utils.validateHmac.mockResolvedValue(true);

    const res = await request(buildApp()).get(
      "/whoami?shop=real-shop.myshopify.com&signature=abc"
    );

    expect(res.status).toBe(200);
    expect(res.body.shop).toBe("real-shop.myshopify.com");
  });

  it("rejects a request with an invalid signature", async () => {
    shopify.api.utils.validateHmac.mockResolvedValue(false);

    const res = await request(buildApp()).get(
      "/whoami?shop=real-shop.myshopify.com&signature=bad"
    );

    expect(res.status).toBe(403);
  });

  it("rejects a validly-signed request missing shop", async () => {
    shopify.api.utils.validateHmac.mockResolvedValue(true);

    const res = await request(buildApp()).get("/whoami?signature=abc");

    expect(res.status).toBe(403);
  });
});
