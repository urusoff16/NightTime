import { describe, expect, it } from 'vitest';

import { dimmingColor } from '../../src/engines/dimming-overlay';

describe('dimming overlay', () => {
  it('clamps the overlay opacity to the allowed range', () => {
    expect(dimmingColor(35)).toBe('rgba(0, 0, 0, 0.35)');
    expect(dimmingColor(100)).toBe('rgba(0, 0, 0, 0.8)');
  });
});
