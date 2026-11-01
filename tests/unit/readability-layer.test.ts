import { describe, expect, it } from 'vitest';

import { READABILITY_CSS } from '../../src/engines/readability-layer';

describe('readability layer', () => {
  it('visually separates text inputs and their forms', () => {
    expect(READABILITY_CSS).toContain('form:has(> textarea)');
    expect(READABILITY_CSS).toContain('var(--night-mode-field-background');
    expect(READABILITY_CSS).not.toContain('[role="textbox"] {');
    expect(READABILITY_CSS).toContain('var(--night-mode-focus-line, #05070a)');
    expect(READABILITY_CSS).toContain(':focus-visible');
    expect(READABILITY_CSS).not.toContain('outline: 0 !important');
    expect(READABILITY_CSS).not.toContain('form:has(> textarea) button');
    expect(READABILITY_CSS).toContain('[contenteditable="true"][role="textbox"]:focus');
    expect(READABILITY_CSS).not.toContain('\n[contenteditable="true"]:focus');
    expect(READABILITY_CSS).not.toContain('\n[role="textbox"]:focus');
  });

  it('does not recolor site-defined transparent field borders', () => {
    const fieldRules = READABILITY_CSS.slice(0, READABILITY_CSS.indexOf('textarea::placeholder'));
    const focusRules = READABILITY_CSS.slice(
      READABILITY_CSS.indexOf('textarea:not([role="combobox"]):focus,'),
      READABILITY_CSS.indexOf('textarea:not([role="combobox"]):focus-visible,'),
    );
    const focusVisibleRules = READABILITY_CSS.slice(
      READABILITY_CSS.indexOf('textarea:not([role="combobox"]):focus-visible,'),
      READABILITY_CSS.indexOf('form:has(> textarea:focus)'),
    );

    expect(fieldRules).not.toContain('border-color');
    expect(focusRules).not.toContain('border-color');
    expect(focusRules).toContain('var(--night-mode-focus-line, #05070a)');
    expect(fieldRules).toContain('textarea:not([role="combobox"])');
    expect(focusRules).toContain('input:not([role="combobox"]):focus');
    expect(focusRules).not.toContain('[contenteditable="true"]:focus');
    expect(focusRules).not.toContain('[role="textbox"]:focus');
    expect(focusVisibleRules).toContain('input:not([role="combobox"]):focus-visible');
    expect(focusVisibleRules).not.toContain('textarea:focus-visible');
    expect(READABILITY_CSS).not.toContain('[role="combobox"]:focus-within');
    expect(READABILITY_CSS).toContain(':not(form):not(input):not(textarea):focus-within');
  });
});
