/**
 * The whole course on one screen: the phone stands a few metres away, so the cards must be
 * as big as possible without scrolling. Tries every column count and keeps the one that
 * gives the widest cards in the box.
 */
export function fitGrid({
  count,
  width,
  height,
  aspect,
  gap,
}: {
  count: number
  width: number
  height: number
  /** Card width / height. */
  aspect: number
  gap: number
}): { columns: number; itemWidth: number } {
  let best = { columns: 1, itemWidth: 0 }
  for (let columns = 1; columns <= Math.max(count, 1); columns++) {
    const rows = Math.ceil(count / columns)
    const cellWidth = (width - (columns - 1) * gap) / columns
    const cellHeight = (height - (rows - 1) * gap) / rows
    const itemWidth = Math.floor(Math.min(cellWidth, cellHeight * aspect))
    if (itemWidth > best.itemWidth) best = { columns, itemWidth }
  }
  return best
}
