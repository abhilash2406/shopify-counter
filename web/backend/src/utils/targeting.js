export function matchesTargeting(timer, { productId, collectionId } = {}) {
  const { mode, resourceIds } = timer.targeting || { mode: "all" };

  if (mode === "all") return true;
  if (mode === "products") return Boolean(productId) && resourceIds.includes(productId);
  if (mode === "collections") return Boolean(collectionId) && resourceIds.includes(collectionId);
  return false;
}
