import { matchesTargeting } from "../../src/utils/targeting.js";

describe("matchesTargeting", () => {
  it("matches everything when mode is 'all'", () => {
    const timer = { targeting: { mode: "all", resourceIds: [] } };
    expect(matchesTargeting(timer, {})).toBe(true);
    expect(matchesTargeting(timer, { productId: "123" })).toBe(true);
  });

  it("matches a product only when its ID is in the targeting list", () => {
    const timer = {
      targeting: { mode: "products", resourceIds: ["111", "222"] },
    };
    expect(matchesTargeting(timer, { productId: "111" })).toBe(true);
    expect(matchesTargeting(timer, { productId: "999" })).toBe(false);
    expect(matchesTargeting(timer, {})).toBe(false);
  });

  it("matches a collection only when its ID is in the targeting list", () => {
    const timer = {
      targeting: { mode: "collections", resourceIds: ["abc"] },
    };
    expect(matchesTargeting(timer, { collectionId: "abc" })).toBe(true);
    expect(matchesTargeting(timer, { collectionId: "xyz" })).toBe(false);
    expect(matchesTargeting(timer, { productId: "abc" })).toBe(false);
  });

  // A product page reports every collection the product belongs to, so the
  // timer only has to target one of them.
  it("matches when any one of the page's collections is targeted", () => {
    const timer = {
      targeting: { mode: "collections", resourceIds: ["sale"] },
    };
    expect(
      matchesTargeting(timer, { collectionIds: ["new", "sale", "featured"] })
    ).toBe(true);
    expect(matchesTargeting(timer, { collectionIds: ["new", "featured"] })).toBe(
      false
    );
    expect(matchesTargeting(timer, { collectionIds: [] })).toBe(false);
    expect(matchesTargeting(timer, {})).toBe(false);
  });
});
