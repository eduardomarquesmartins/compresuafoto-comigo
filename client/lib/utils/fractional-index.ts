/**
 * Fractional Indexing / Lexorank helper for O(1) reordering.
 * Avoids updating hundreds of rows on drag-and-drop.
 */

export const DEFAULT_SPACING = 1000;

export function calculateNewPosition(
  prevPosition: number | null | undefined,
  nextPosition: number | null | undefined
): number {
  // Case 1: Inserting into an empty list
  if (prevPosition == null && nextPosition == null) {
    return DEFAULT_SPACING;
  }

  // Case 2: Inserting at the very top (before the first item)
  if (prevPosition == null && nextPosition != null) {
    return nextPosition > 1 ? nextPosition / 2 : nextPosition - 0.5;
  }

  // Case 3: Inserting at the very bottom (after the last item)
  if (prevPosition != null && nextPosition == null) {
    return prevPosition + DEFAULT_SPACING;
  }

  // Case 4: Inserting between two items
  if (prevPosition != null && nextPosition != null) {
    return (prevPosition + nextPosition) / 2;
  }

  return DEFAULT_SPACING;
}
