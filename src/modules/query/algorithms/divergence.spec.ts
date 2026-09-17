import { describe, it, expect } from 'vitest';
import { computeDistributionDivergence } from './divergence.js';

describe('computeDistributionDivergence', () => {
  it('returns 0 for identical distributions', () => {
    const target = ['errorA', 'errorA', 'errorB'];
    const baseline = ['errorA', 'errorA', 'errorB'];
    const score = computeDistributionDivergence(target, baseline);
    expect(score).toBe(0);
  });

  it('returns 1 for completely disjoint distributions', () => {
    const target = ['node-1', 'node-1', 'node-1'];
    const baseline = ['node-2', 'node-2', 'node-2'];
    const score = computeDistributionDivergence(target, baseline);
    expect(score).toBe(1);
  });

  it('returns fractional divergence for partially overlapping distributions', () => {
    const target = ['500', '500', '500', '200'];
    const baseline = ['200', '200', '200', '500'];
    const score = computeDistributionDivergence(target, baseline);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
    expect(score).toBe(0.5);
  });
});
