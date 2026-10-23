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

// Ranks players for the leaderboard and results. Returns a new array of
// { id, name, finishedAt, total }:
//   finished players first, by finish time (earliest wins);
//   then unfinished players by total squares marked (most wins);
//   name A→Z breaks any tie.
// total counts real marks only, never the FREE square.
export function rankPlayers(players, marks) {
  // Group marked cells by player first, so each player is a quick lookup.
  // Marks for players not in the list are never looked at.
  const cellsByPlayer = new Map();
  for (const mark of marks) {
    if (!cellsByPlayer.has(mark.player_id)) cellsByPlayer.set(mark.player_id, new Set());
    cellsByPlayer.get(mark.player_id).add(mark.cell_index);
  }

  const ranked = players.map((player) => {
    const cells = cellsByPlayer.get(player.id) ?? new Set();
    const total = [...cells].filter((i) => player.board[i]?.type !== 'free').length;
    return { id: player.id, name: player.name, finishedAt: player.finished_at, total };
  });

  return ranked.sort(compareRanked); // sorts our new array, not the input
}

function compareRanked(a, b) {
  if (a.finishedAt && b.finishedAt) {
    return Date.parse(a.finishedAt) - Date.parse(b.finishedAt) || a.name.localeCompare(b.name);
  }
  if (a.finishedAt) return -1; // only a finished
  if (b.finishedAt) return 1;  // only b finished
  return b.total - a.total || a.name.localeCompare(b.name);
}
