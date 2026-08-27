import { z } from "zod";
import { BadRequest } from "../../common/exceptions/index.js";

// Create sends ISO strings; update validates the merged doc, where they are
// already Dates. Caught here, a bad date is a 400 rather than a cast 500.
const dateLike = z
  .union([z.string(), z.date()], { error: "must be a date" })
  .refine((value) => !Number.isNaN(new Date(value).getTime()), {
    error: "must be a valid date",
  });

const timerSchema = z
  .object({
    name: z
      .string({ error: "name is required" })
      .trim()
      .min(1, { error: "name is required" }),
    type: z.enum(["fixed", "evergreen"], {
      error: "type must be 'fixed' or 'evergreen'",
    }),
    startDate: dateLike.optional().nullable(),
    endDate: dateLike.optional().nullable(),
    durationSeconds: z.number().optional().nullable(),
    targeting: z
      .object({
        mode: z
          .enum(["all", "products", "collections"], {
            error: "targeting.mode is invalid",
          })
          .optional(),
        resourceIds: z.array(z.string()).optional(),
      })
      .optional(),
  })
  // Cross-field rules; runs only once each field above is valid on its own.
  .superRefine((input, ctx) => {
    if (input.type === "fixed") {
      if (!input.startDate || !input.endDate) {
        ctx.addIssue({
          code: "custom",
          message: "fixed timers require startDate and endDate",
        });
      } else if (new Date(input.endDate) <= new Date(input.startDate)) {
        ctx.addIssue({
          code: "custom",
          message: "endDate must be after startDate",
        });
      }
    }

    if (input.type === "evergreen" && !(input.durationSeconds > 0)) {
      ctx.addIssue({
        code: "custom",
        message: "evergreen timers require a positive durationSeconds",
      });
    }

    const mode = input.targeting?.mode || "all";
    if (mode !== "all" && !input.targeting?.resourceIds?.length) {
      ctx.addIssue({
        code: "custom",
        message:
          "targeting.resourceIds is required when targeting.mode is not 'all'",
      });
    }
  });

// Also the hard cap: an oversized `limit` is a 400, not a silent clamp.
export const TIMER_PAGE_SIZE = 10;

// GET /api/timers query. Params arrive as strings, hence `coerce`.
const listTimersQuerySchema = z.object({
  limit: z.coerce
    .number({ error: "limit must be a number" })
    .int({ error: "limit must be a whole number" })
    .min(1, { error: "limit must be at least 1" })
    .max(TIMER_PAGE_SIZE, {
      error: `limit must be at most ${TIMER_PAGE_SIZE}`,
    })
    .default(TIMER_PAGE_SIZE),
  offset: z.coerce
    .number({ error: "offset must be a number" })
    .int({ error: "offset must be a whole number" })
    .min(0, { error: "offset must not be negative" })
    .default(0),
});

/** Turns a zod error into the BadRequest the API already exposes. */
const toBadRequest = (error) => {
  const issues = error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));

  return new BadRequest(issues[0].message, "BAD_REQUEST", 400, { issues });
};

/** Throws BadRequest on the first problem; every issue is in `details.issues`. */
export const validateTimerInput = (input) => {
  const result = timerSchema.safeParse(input);
  if (!result.success) throw toBadRequest(result.error);
};

/** Returns the parsed query with defaults applied; throws BadRequest if invalid. */
export const parseListTimersQuery = (query) => {
  const result = listTimersQuerySchema.safeParse(query);
  if (!result.success) throw toBadRequest(result.error);
  return result.data;
};

export { timerSchema, listTimersQuerySchema };
