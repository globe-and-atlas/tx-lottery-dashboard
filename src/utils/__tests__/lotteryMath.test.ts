import { expect, test, describe } from 'vitest';
import {
  probabilityToOdds,
  oddsToProbability,
  wilsonLowerBoundProbability,
  clampNumber,
} from '../lotteryMath';

describe('Lottery EV Math Invariants', () => {
  test('probabilityToOdds perfectly inverses oddsToProbability', () => {
    const p = 0.25;
    const odds = probabilityToOdds(p);
    expect(odds).toBe(4);
    expect(oddsToProbability(odds)).toBe(Math.fround(p));
  });

  test('oddsToProbability correctly handles fractional odds', () => {
    const odds = 3.5;
    expect(oddsToProbability(odds)).toBeCloseTo(0.2857, 4);
    expect(probabilityToOdds(oddsToProbability(odds))).toBeCloseTo(3.5, 4);
  });

  test('oddsToProbability edge cases', () => {
    expect(oddsToProbability(null)).toBe(0);
    expect(oddsToProbability(0)).toBe(0);
    expect(oddsToProbability(-5)).toBe(0);
  });

  test('clampNumber restricts boundaries cleanly', () => {
    expect(clampNumber(5, 0, 10)).toBe(5);
    expect(clampNumber(-5, 0, 10)).toBe(0);
    expect(clampNumber(15, 0, 10)).toBe(10);
  });

  test('wilsonLowerBoundProbability penalizes small sample sizes correctly', () => {
    // Both reflect a 50% hit rate, but the second has a huge sample size
    const boundsLowSample = wilsonLowerBoundProbability(5, 10);
    const boundsHighSample = wilsonLowerBoundProbability(500, 1000);

    // High sample should have much tighter confidence intervals (higher lower bound)
    expect(boundsHighSample).toBeGreaterThan(boundsLowSample);
  });

  test('wilsonLowerBoundProbability caps maximum hits', () => {
    const bounds = wilsonLowerBoundProbability(11, 10);
    // Even with 11 hits out of 10, the clamp should prevent probabilities > 1 and return a sane bound
    expect(bounds).toBeLessThanOrEqual(1.0);
    expect(bounds).toBeGreaterThan(0.5);
  });

  test('wilsonLowerBoundProbability evaluates 0 for invalid inputs', () => {
    expect(wilsonLowerBoundProbability(0, 10)).toBe(0);
    expect(wilsonLowerBoundProbability(5, 0)).toBe(0);
    expect(wilsonLowerBoundProbability(-1, 10)).toBe(0);
    expect(wilsonLowerBoundProbability(5, -10)).toBe(0);
  });
});
