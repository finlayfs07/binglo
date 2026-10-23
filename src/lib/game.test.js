import { describe, expect, test } from 'vitest';
import { findCompletedLine, getLines, promptsNeeded, rankPlayers } from './game.js';

// count squares starting at `start`, each `step` apart: line(0, 1, 5) → [0, 1, 2, 3, 4]
function line(start, step, count) {
  return Array.from({ length: count }, (_, i) => start + i * step);
}

// Every winning line for a size, worked out here independently of getLines,
// so a mistake in getLines can't hide in these tests.
function allLineCases(size) {
  const cases = [];
  for (let r = 0; r < size; r++) {
    cases.push({ size, name: `row ${r}`, indexes: line(r * size, 1, size) });
  }
  for (let c = 0; c < size; c++) {
    cases.push({ size, name: `column ${c}`, indexes: line(c, size, size) });
  }
  cases.push({ size, name: '↘ diagonal', indexes: line(0, size + 1, size) });
  cases.push({ size, name: '↙ diagonal', indexes: line(size - 1, size - 1, size) });
  return cases;
}

describe('promptsNeeded', () => {
  test.each([
    { size: 4, expected: 16 },
    { size: 5, expected: 24 },
    { size: 6, expected: 36 },
  ])('$size×$size needs $expected prompts', ({ size, expected }) => {
    expect(promptsNeeded(size)).toBe(expected);
  });
});

describe('getLines', () => {
  test.each([4, 5, 6])('returns size*2 + 2 lines for size %i', (size) => {
    expect(getLines(size)).toHaveLength(size * 2 + 2);
  });
});

describe('findCompletedLine', () => {
  test.each([...allLineCases(4), ...allLineCases(5), ...allLineCases(6)])(
    '$size×$size: detects $name',
    ({ size, indexes }) => {
      expect(findCompletedLine(new Set(indexes), size)).toEqual(indexes);
    },
  );

  test('empty board → null', () => {
    expect(findCompletedLine(new Set(), 5)).toBeNull();
  });

  test('5×5 with only FREE (12) marked → null', () => {
    expect(findCompletedLine(new Set([12]), 5)).toBeNull();
  });

  test('5×5 middle row using FREE → detected', () => {
    expect(findCompletedLine(new Set([10, 11, 12, 13, 14]), 5)).toEqual([
      10, 11, 12, 13, 14,
    ]);
  });

  test('4 of 5 in a row → null', () => {
    expect(findCompletedLine(new Set([0, 1, 2, 3]), 5)).toBeNull();
  });

  test('wrap-around trap: end of row 0 + start of row 1 → null', () => {
    expect(findCompletedLine(new Set([3, 4, 5, 6, 7]), 5)).toBeNull();
  });

  test('the four corners only → null', () => {
    expect(findCompletedLine(new Set([0, 4, 20, 24]), 5)).toBeNull();
  });
});

describe('rankPlayers', () => {
  // A board of plain squares, with FREE in the centre on odd sizes.
  function makeBoard(size) {
    const board = Array.from({ length: size * size }, () => ({ text: 'x', type: 'thing' }));
    if (size % 2 === 1) board[(size * size - 1) / 2] = { text: 'FREE', type: 'free' };
    return board;
  }

  function makePlayer(name, size, finishedAt = null) {
    return {
      id: name,
      name,
      board: makeBoard(size),
      finished_at: finishedAt,
      joined_at: '2026-10-23T10:00:00Z',
    };
  }

  function makeMarks(playerId, cells) {
    return cells.map((cell_index) => ({ player_id: playerId, cell_index }));
  }

  const names = (ranked) => ranked.map((p) => p.name);

  test('finished players rank above unfinished, regardless of squares', () => {
    const players = [makePlayer('Aisha', 5), makePlayer('Ben', 5, '2026-10-23T10:06:41Z')];
    const marks = [
      ...makeMarks('Aisha', [0, 1, 2, 3, 5, 6, 7, 8]), // 8 squares, no line
      ...makeMarks('Ben', [10, 11, 13, 14]), // 4 squares + FREE = middle row
    ];
    expect(names(rankPlayers(players, marks))).toEqual(['Ben', 'Aisha']);
  });

  test('two finished players sort by earlier finished_at', () => {
    const players = [
      makePlayer('Aisha', 4, '2026-10-23T10:05:00Z'),
      makePlayer('Ben', 4, '2026-10-23T10:02:00Z'),
    ];
    expect(names(rankPlayers(players, []))).toEqual(['Ben', 'Aisha']);
  });

  test('unfinished: higher total wins', () => {
    const players = [makePlayer('Aisha', 4), makePlayer('Ben', 4)];
    const marks = [...makeMarks('Aisha', [0, 1, 2]), ...makeMarks('Ben', [0, 5, 10, 13])];
    const ranked = rankPlayers(players, marks);
    expect(names(ranked)).toEqual(['Ben', 'Aisha']);
    expect(ranked.map((p) => p.total)).toEqual([4, 3]);
  });

  test('unfinished with equal total: name A–Z', () => {
    const players = [makePlayer('Chen', 4), makePlayer('Aisha', 4)];
    const marks = [...makeMarks('Chen', [0, 1]), ...makeMarks('Aisha', [6, 7])];
    expect(names(rankPlayers(players, marks))).toEqual(['Aisha', 'Chen']);
  });

  test('a mark on the FREE square is not counted in total', () => {
    const players = [makePlayer('Aisha', 5)];
    const marks = makeMarks('Aisha', [10, 11, 12]); // 12 is FREE on 5×5
    expect(rankPlayers(players, marks)[0]).toEqual({
      id: 'Aisha',
      name: 'Aisha',
      finishedAt: null,
      total: 2,
    });
  });

  test('marks for player ids not in the players list are ignored', () => {
    const players = [makePlayer('Aisha', 4)];
    const marks = [...makeMarks('Aisha', [0]), ...makeMarks('ghost', [1, 2, 3])];
    const ranked = rankPlayers(players, marks);
    expect(ranked).toHaveLength(1);
    expect(ranked[0]).toMatchObject({ id: 'Aisha', total: 1 });
  });

  test('does not change the input arrays', () => {
    const players = [makePlayer('Ben', 4), makePlayer('Aisha', 4)];
    const marks = makeMarks('Aisha', [0]);
    const playersBefore = structuredClone(players);
    const marksBefore = structuredClone(marks);
    rankPlayers(players, marks);
    expect(players).toEqual(playersBefore);
    expect(marks).toEqual(marksBefore);
  });
});
