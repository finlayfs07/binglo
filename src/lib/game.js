export function promptsNeeded(gridSize) {
  const total = gridSize * gridSize;      // 5 → 25 squares
  const hasCentre = gridSize % 2 === 1;   // odd sizes have one middle square
  return hasCentre ? total - 1 : total;   // the middle square is FREE, so it needs no prompt
}

// All the winning lines for a size×size board, as lists of square indexes.
// Squares are numbered left to right, top to bottom: 0, 1, 2, ...
export function getLines(size) {
  const lines = [];
  for (let r = 0; r < size; r++) {
    lines.push(Array.from({ length: size }, (_, c) => r * size + c)); // rows
  }
  for (let c = 0; c < size; c++) {
    lines.push(Array.from({ length: size }, (_, r) => r * size + c)); // columns
  }
  lines.push(Array.from({ length: size }, (_, i) => i * size + i));              // ↘ diagonal
  lines.push(Array.from({ length: size }, (_, i) => i * size + (size - 1 - i))); // ↙ diagonal
  return lines;
}

// marked: a Set of marked square indexes (include the FREE square).
// Returns the first completed line, or null.
export function findCompletedLine(marked, size) {
  return getLines(size).find((line) => line.every((i) => marked.has(i))) ?? null;
}