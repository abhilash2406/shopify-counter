import path from "path";
import { fileURLToPath } from "url";

import basicAuth from "express-basic-auth";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

import { env } from "./env.js";
import { logger } from "./winston.js";


const srcDir = path
  .dirname(path.dirname(fileURLToPath(import.meta.url)))
  .replace(/\\/g, "/");

export const DOCS_PATH = "/api-docs";

const spec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Countdown Timer App API",
      version: "1.0.0",
      description:
        "Admin routes (`/api/timers`, `/api/analytics`) are called from the " +
        "embedded admin UI and authenticated by Shopify's session token — the " +
        "shop is derived from the verified session, never from a request " +
        "parameter. Public routes (`/api/public/*`) are called from the " +
        "storefront through Shopify's App Proxy and authenticated by its HMAC " +
        "signature instead.\n\n" +
        "Because both schemes are applied by Shopify middleware rather than a " +
        "bearer token you can paste here, **Try it out** will not succeed " +
        "against a live server from this page.",
    },
    servers: [{ url: "/", description: "This server" }],
    tags: [
      { name: "Timers", description: "Admin CRUD for countdown timers" },
      { name: "Analytics", description: "Admin impression analytics" },
      {
        name: "Public",
        description: "Storefront widget endpoints (via Shopify App Proxy)",
      },
    ],
    components: {
      schemas: {
        Targeting: {
          type: "object",
          properties: {
            mode: {
              type: "string",
              enum: ["all", "products", "collections"],
              default: "all",
            },
            resourceIds: {
              type: "array",
              items: { type: "string" },
              description:
                "Plain numeric Shopify IDs (not GIDs) — that is all Liquid " +
                "exposes to the storefront block for matching.",
            },
            resources: {
              type: "array",
              description:
                "Only present on GET /api/timers/{id} when mode is not 'all'. " +
                "Titles are resolved live from the Admin GraphQL API.",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  title: { type: "string" },
                },
              },
            },
          },
        },
        Appearance: {
          type: "object",
          properties: {
            backgroundColor: { type: "string", default: "#1a1a1a" },
            textColor: { type: "string", default: "#ffffff" },
            size: {
              type: "string",
              enum: ["small", "medium", "large"],
              default: "medium",
            },
            position: {
              type: "string",
              enum: ["inline", "top", "bottom"],
              default: "inline",
              description:
                "'inline' renders where the merchant placed the block; " +
                "'top'/'bottom' render as a bar fixed to the viewport edge.",
            },
            message: { type: "string", default: "Offer ends in:" },
            expiredMessage: { type: "string", default: "" },
            urgencyStyle: {
              type: "string",
              enum: ["none", "pulse", "shake", "flash"],
              default: "pulse",
              description:
                "Visual cue applied in the final minutes before expiry.",
            },
          },
        },
        Timer: {
          type: "object",
          properties: {
            _id: { type: "string", example: "665f1b2c3d4e5f6a7b8c9d0e" },
            shop: { type: "string", example: "example.myshopify.com" },
            name: { type: "string", maxLength: 120, example: "Summer Sale" },
            type: { type: "string", enum: ["fixed", "evergreen"] },
            isEnabled: { type: "boolean", default: true },
            startDate: {
              type: "string",
              format: "date-time",
              description: "Fixed timers only.",
            },
            endDate: {
              type: "string",
              format: "date-time",
              description: "Fixed timers only.",
            },
            durationSeconds: {
              type: "integer",
              minimum: 1,
              description: "Evergreen timers only.",
              example: 900,
            },
            targeting: { $ref: "#/components/schemas/Targeting" },
            appearance: { $ref: "#/components/schemas/Appearance" },
            status: {
              type: "string",
              enum: ["scheduled", "active", "expired", "disabled"],
              description: "Computed, not stored.",
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        TimerInput: {
          type: "object",
          required: ["name", "type"],
          properties: {
            name: { type: "string", maxLength: 120, example: "Summer Sale" },
            type: { type: "string", enum: ["fixed", "evergreen"] },
            isEnabled: { type: "boolean", default: true },
            startDate: {
              type: "string",
              format: "date-time",
              description: "Required when type is 'fixed'.",
            },
            endDate: {
              type: "string",
              format: "date-time",
              description:
                "Required when type is 'fixed'; must be after startDate.",
            },
            durationSeconds: {
              type: "integer",
              minimum: 1,
              description: "Required (and positive) when type is 'evergreen'.",
            },
            targeting: { $ref: "#/components/schemas/Targeting" },
            appearance: { $ref: "#/components/schemas/Appearance" },
          },
        },
        PublicTimerConfig: {
          type: "object",
          description:
            "The trimmed, non-sensitive projection the storefront widget " +
            "renders from.",
          properties: {
            id: { type: "string" },
            type: { type: "string", enum: ["fixed", "evergreen"] },
            startDate: { type: "string", format: "date-time" },
            endDate: { type: "string", format: "date-time" },
            durationSeconds: { type: "integer" },
            appearance: { $ref: "#/components/schemas/Appearance" },
          },
        },
        Pagination: {
          type: "object",
          properties: {
            total: {
              type: "integer",
              description:
                "Size of the whole result set, not of this page.",
              example: 42,
            },
            limit: { type: "integer", example: 10 },
            offset: { type: "integer", example: 0 },
            hasMore: {
              type: "boolean",
              description: "Whether another page follows this one.",
            },
          },
        },
        Analytics: {
          type: "object",
          properties: {
            total: { type: "integer", example: 42 },
            byDay: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  day: { type: "string", format: "date-time" },
                  count: { type: "integer" },
                },
              },
            },
          },
        },
        Success: {
          type: "object",
          description:
            "Envelope every admin endpoint answers with. Storefront " +
            "(`/api/public/*`) success bodies are unwrapped — see their notes.",
          required: ["success", "message", "data"],
          properties: {
            success: { type: "boolean", enum: [true] },
            message: {
              type: "string",
              example: "Timers fetched successfully.",
            },
            data: { type: "object" },
          },
        },
        Error: {
          type: "object",
          required: ["success", "message"],
          properties: {
            success: { type: "boolean", enum: [false] },
            message: { type: "string", example: "Timer not found" },
            code: {
              type: "string",
              description:
                "Machine-readable code. Absent on unexpected 500s, which are " +
                "deliberately generic.",
              example: "NOT_FOUND",
            },
            details: {
              type: "object",
              description:
                "Present on validation failures. `message` above is the first " +
                "issue; `issues` lists them all so a form can highlight each " +
                "offending field.",
              properties: {
                issues: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      path: { type: "string", example: "targeting.mode" },
                      message: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        BadRequest: {
          description: "Validation failed",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        Unauthorized: {
          description: "Missing or invalid Shopify session / proxy signature",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        NotFound: {
          description: "Not found, or not owned by the authenticated shop",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        Conflict: {
          description:
            "Optimistic-concurrency check failed — the resource was " +
            "changed elsewhere since the caller last fetched it",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        TooManyRequests: {
          description: "Rate limit exceeded (120 requests/minute per IP)",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  },
  // Route files carry the per-endpoint @openapi blocks.
  apis: [`${srcDir}/modules/**/*.routes.js`],
});

/**
 * Mounts Swagger UI at DOCS_PATH behind basic auth.
 *
 * Skipped entirely when SWAGGER_PASSWORD is unset: publishing the full API
 * surface unauthenticated is worse than not having the docs route at all, so
 * the failure mode is "no docs" rather than "open docs".
 *
 * @param {import("express").Express} app
 * @returns {boolean} whether the docs route was mounted
 */
export function mountSwagger(app) {
  if (!env.swagger.password) {
    logger.warn(
      `[swagger] ${DOCS_PATH} disabled — set SWAGGER_PASSWORD to enable it`
    );
    return false;
  }

  app.use(
    DOCS_PATH,
    basicAuth({
      users: { [env.swagger.user]: env.swagger.password },
      challenge: true,
      realm: "Countdown Timer API docs",
    }),
    swaggerUi.serve,
    swaggerUi.setup(spec, {
      customSiteTitle: "Countdown Timer App API",
      swaggerOptions: { persistAuthorization: true },
    })
  );

  return true;
}

export { spec as swaggerSpec };
