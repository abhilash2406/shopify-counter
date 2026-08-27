import { validateTimerInput } from "../../../src/modules/timers/timer.validation.js";

const fixed = () => ({
  name: "Summer sale",
  type: "fixed",
  startDate: "2026-01-01T00:00:00.000Z",
  endDate: "2026-01-31T00:00:00.000Z",
});

const evergreen = () => ({
  name: "Flash offer",
  type: "evergreen",
  durationSeconds: 900,
});

/** Returns the thrown error, or fails the test if nothing was thrown. */
function catchError(input) {
  try {
    validateTimerInput(input);
  } catch (error) {
    return error;
  }
  throw new Error("Expected validateTimerInput to throw, but it did not");
}

describe("validateTimerInput", () => {
  describe("accepts", () => {
    it.each([
      ["a fixed timer", fixed()],
      ["an evergreen timer", evergreen()],
      ["no targeting key at all", evergreen()],
      ["targeting all", { ...evergreen(), targeting: { mode: "all" } }],
      [
        "targeting products with ids",
        {
          ...evergreen(),
          targeting: { mode: "products", resourceIds: ["123"] },
        },
      ],
    ])("%s", (_label, input) => {
      expect(() => validateTimerInput(input)).not.toThrow();
    });

    // updateTimer validates { ...timer.toObject(), ...input }, so the schema
    // must tolerate Date instances and the document's own fields.
    it("a merged Mongoose document with Date objects and extra keys", () => {
      expect(() =>
        validateTimerInput({
          _id: "665f1b2c3d4e5f6a7b8c9d0e",
          shop: "shop.myshopify.com",
          __v: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          name: "Summer sale",
          type: "fixed",
          startDate: new Date("2026-01-01T00:00:00.000Z"),
          endDate: new Date("2026-01-31T00:00:00.000Z"),
          isEnabled: true,
          targeting: { mode: "all", resourceIds: [] },
          appearance: { backgroundColor: "#1a1a1a", size: "medium" },
        })
      ).not.toThrow();
    });
  });

  describe("rejects", () => {
    it.each([
      ["a missing name", { type: "fixed" }, /name is required/],
      ["a blank name", { ...fixed(), name: "   " }, /name is required/],
      ["an unknown type", { name: "x", type: "nope" }, /type must be/],
      [
        "a fixed timer with no dates",
        { name: "x", type: "fixed" },
        /require startDate and endDate/,
      ],
      [
        "endDate equal to startDate",
        { ...fixed(), endDate: fixed().startDate },
        /endDate must be after startDate/,
      ],
      [
        "endDate before startDate",
        { ...fixed(), startDate: "2026-02-01", endDate: "2026-01-01" },
        /endDate must be after startDate/,
      ],
      [
        "an unparseable date",
        { ...fixed(), startDate: "not-a-date" },
        /must be a valid date/,
      ],
      [
        "an evergreen timer with no duration",
        { name: "x", type: "evergreen" },
        /positive durationSeconds/,
      ],
      [
        "a zero duration",
        { ...evergreen(), durationSeconds: 0 },
        /positive durationSeconds/,
      ],
      [
        "a negative duration",
        { ...evergreen(), durationSeconds: -1 },
        /positive durationSeconds/,
      ],
      [
        "an invalid targeting mode",
        { ...evergreen(), targeting: { mode: "bogus" } },
        /targeting.mode is invalid/,
      ],
      [
        "targeting products with no ids",
        { ...evergreen(), targeting: { mode: "products", resourceIds: [] } },
        /targeting.resourceIds is required/,
      ],
    ])("%s", (_label, input, expected) => {
      const error = catchError(input);
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe("BAD_REQUEST");
      expect(error.message).toMatch(expected);
    });
  });

  it("attaches every issue under details.issues, not just the thrown one", () => {
    const error = catchError({ name: "", type: "nope" });

    expect(error.details.issues.length).toBeGreaterThan(1);
    expect(error.details.issues[0]).toEqual({
      path: expect.any(String),
      message: error.message,
    });
  });
});
