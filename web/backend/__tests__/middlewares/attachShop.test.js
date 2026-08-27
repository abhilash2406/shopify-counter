import express from "express";
import request from "supertest";
import { attachShop } from "../../src/middlewares/attachShop.js";

function buildApp(sessionShop) {
  const app = express();
  app.use((req, res, next) => {
    res.locals.shopify = { session: { shop: sessionShop } };
    next();
  });
  app.use(attachShop);
  app.get("/whoami", (req, res) => res.json({ shop: req.shop }));
  return app;
}

describe("attachShop middleware", () => {
  it("derives req.shop from the verified session, not a client-supplied value", async () => {
    const app = buildApp("real-shop.myshopify.com");

    const response = await request(app)
      .get("/whoami?shop=attacker-shop.myshopify.com")
      .send();

    expect(response.body.shop).toBe("real-shop.myshopify.com");
  });
});
