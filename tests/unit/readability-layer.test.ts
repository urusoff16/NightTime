import { describe, expect, it } from 'vitest';

import { READABILITY_CSS } from '../../src/engines/readability-layer';

describe('readability layer', () => {
  it('visually separates text inputs and their forms', () => {
    expect(READABILITY_CSS).toContain('form:has(textarea)');
    expect(READABILITY_CSS).toContain('var(--night-mode-field-background');
    expect(READABILITY_CSS).not.toContain('[role="textbox"] {');
    expect(READABILITY_CSS).toContain('var(--night-mode-focus-line, #05070a)');
    expect(READABILITY_CSS).toContain(':focus-visible');
    expect(READABILITY_CSS).not.toContain('outline: 0 !important');
    expect(READABILITY_CSS).not.toContain('form:has(textarea) button');
    expect(READABILITY_CSS).toContain('[contenteditable="true"]:focus');
  });
});
