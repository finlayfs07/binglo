export function promptsNeeded(gridSize) {
  const total = gridSize * gridSize;      // 5 → 25 squares
  const hasCentre = gridSize % 2 === 1;   // odd sizes have one middle square
  return hasCentre ? total - 1 : total;   // the middle square is FREE, so it needs no prompt
}