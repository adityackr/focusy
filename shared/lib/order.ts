/**
 * Rebuild a full order list after reordering only a visible subset (e.g. one
 * category). Visible items take the slots they already occupied, in their new
 * relative order; every other item keeps its exact position.
 */
export function reorderWithin(allIds: string[], visibleIds: string[]): string[] {
  const visible = new Set(visibleIds);
  let cursor = 0;
  return allIds.map((id) => (visible.has(id) ? visibleIds[cursor++] : id));
}
