import shopify from "../../config/shopify.js";
import { asyncHandler } from "../../common/asyncHandler.js";
import { goodResponse } from "../../utils/response.js";
import { parseListTimersQuery } from "./timer.validation.js";
import * as timerService from "./timer.service.js";


// timer list api
export const listTimers = asyncHandler(async (req, res) => {
  const query = parseListTimersQuery(req.query);
  const { timers, pagination } = await timerService.listTimers(req.shop, query);
  res.json(
    goodResponse({ timers, pagination }, "Timers fetched successfully.")
  );
});


// fetch each timer data
export const getTimer = asyncHandler(async (req, res) => {
  const timer = await timerService.getTimer(req.shop, req.params.id);
  const enriched = await withResourceTitles(res.locals.shopify.session, timer);
  res.json(goodResponse({ timer: enriched }, "Timer fetched successfully."));
});

// Timer.targeting.resourceIds stores plain numeric IDs — that's all Liquid exposes for the storefront-side match (block.settings.product.id). The Admin GraphQL API needs GIDs, so we rebuild them from the targeting mod before resolving titles for the edit form.


async function withResourceTitles(session, timer) {
  const plain = timer.toObject();
  const { mode, resourceIds } = plain.targeting;
  if (mode === "all" || !resourceIds.length) return plain;

  const gidType = mode === "collections" ? "Collection" : "Product";
  const gids = resourceIds.map((id) => `gid://shopify/${gidType}/${id}`);

  const client = new shopify.api.clients.Graphql({ session });
  const { data } = await client.request(
    `query ResourceTitles($ids: [ID!]!) {
      nodes(ids: $ids) {
        ... on Product { id title }
        ... on Collection { id title }
      }
    }`,
    { variables: { ids: gids } }
  );

  plain.targeting.resources = (data?.nodes || [])
    .filter(Boolean)
    .map((node) => ({ id: node.id.split("/").pop(), title: node.title }));

  return plain;
}

 // to create a timer

export const createTimer = asyncHandler(async (req, res) => {
  const timer = await timerService.createTimer(req.shop, req.body);
  res.status(201).json(goodResponse({ timer }, "Timer created successfully."));
});


// to update a timer
export const updateTimer = asyncHandler(async (req, res) => {
  const timer = await timerService.updateTimer(
    req.shop,
    req.params.id,
    req.body
  );
  res.json(goodResponse({ timer }, "Timer updated successfully."));
});

// to delete a timer

export const deleteTimer = asyncHandler(async (req, res) => {
  await timerService.deleteTimer(req.shop, req.params.id);
  res.status(204).end();
});
