import { describe, expect, it } from 'vitest';

import { READABILITY_CSS } from '../../src/engines/readability-layer';

describe('readability layer', () => {
  it('visually separates text inputs and their forms', () => {
    expect(READABILITY_CSS).toContain('form:has(textarea)');
    expect(READABILITY_CSS).toContain('rgba(151, 157, 168, 0.46)');
    expect(READABILITY_CSS).toContain('var(--night-mode-field-background');
    expect(READABILITY_CSS).toContain('var(--night-mode-control-background)');
    expect(READABILITY_CSS).not.toContain('[role="textbox"] {');
    expect(READABILITY_CSS).toContain('rgba(255, 255, 255, 0.98)');
    expect(READABILITY_CSS).toContain('[contenteditable="true"]:focus');
  });
});
