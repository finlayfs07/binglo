import { describe, expect, test } from 'vitest';
import { findCompletedLine, getLines, promptsNeeded } from './game.js';

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
