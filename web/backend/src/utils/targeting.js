// `collectionIds` is a list because a product belongs to many collections at
// once; a single `collectionId` is still accepted for a lone collection page.
const toCollectionList = (collectionId, collectionIds) => {
  if (Array.isArray(collectionIds)) return collectionIds;
  return collectionId ? [collectionId] : [];
};

export function matchesTargeting(
  timer,
  { productId, collectionId, collectionIds } = {}
) {
  const { mode, resourceIds } = timer.targeting || { mode: "all" };

  if (mode === "all") return true;
  if (mode === "products") return Boolean(productId) && resourceIds.includes(productId);
  if (mode === "collections") {
    // Any overlap counts — the timer targets one of the product's collections.
    return toCollectionList(collectionId, collectionIds).some((id) =>
      resourceIds.includes(id)
    );
  }
  return false;
}

export { toCollectionList };
