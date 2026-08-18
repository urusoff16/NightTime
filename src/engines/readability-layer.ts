import type { ThemeSettings } from '../shared/settings-model';

const STYLE_ID = 'night-mode-readability-layer';

export const READABILITY_CSS = `
textarea,
input[type="text"],
input[type="search"],
input[type="email"],
input[type="url"],
input[type="password"] {
  background-color: var(--night-mode-field-background, rgba(30, 35, 47, 0.96)) !important;
  border-color: var(--night-mode-field-border, #414b60) !important;
  box-shadow: var(--night-mode-field-shadow, inset 0 1px rgba(255, 255, 255, 0.035)) !important;
}

textarea::placeholder,
input::placeholder,
[contenteditable="true"][data-placeholder]::before {
  color: var(--night-mode-muted-text, #aeb8c8) !important;
  opacity: 1 !important;
}

form:has(textarea),
form:has([contenteditable="true"]),
[role="form"]:has(textarea),
[role="form"]:has([contenteditable="true"]) {
  background-color: var(--night-mode-form-background, rgba(22, 26, 35, 0.92)) !important;
  border-color: var(--night-mode-field-border, #414b60) !important;
  box-shadow: var(--night-mode-form-shadow, 0 0 0 1px var(--night-mode-field-border, #414b60), 0 12px 30px rgba(0, 0, 0, 0.2)) !important;
}

textarea:focus,
input:focus,
[contenteditable="true"]:focus,
[role="textbox"]:focus {
  border-color: var(--night-mode-focus-border, #242832) !important;
  background-image: none !important;
  box-shadow: inset 0 -2px 0 var(--night-mode-focus-line, #05070a) !important;
  outline: 2px solid transparent !important;
  outline-offset: 2px !important;
}

textarea:focus-visible,
input:focus-visible,
[contenteditable="true"]:focus-visible,
[role="textbox"]:focus-visible {
  outline: 2px solid var(--night-mode-focus-ring, #687080) !important;
  outline-offset: 2px !important;
}

form:has(textarea:focus),
form:has([contenteditable="true"]:focus),
[role="form"]:has(textarea:focus),
[role="form"]:has([contenteditable="true"]:focus) {
  border-color: var(--night-mode-focus-border, #242832) !important;
  box-shadow: 0 0 0 1px var(--night-mode-focus-border, #242832), 0 12px 30px rgba(0, 0, 0, 0.2) !important;
}

[role="search"]:focus-within,
[role="combobox"]:focus-within {
  border-color: var(--night-mode-focus-border, #242832) !important;
  box-shadow: inset 0 -2px 0 var(--night-mode-focus-line, #05070a), 0 0 0 1px var(--night-mode-focus-border, #242832) !important;
}
`;

export class ReadabilityLayer {
  apply(settings: ThemeSettings): void {
    if (typeof document === 'undefined') return;
    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (style === null) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      style.dataset.nightModeLayer = 'readability';
      (document.head ?? document.documentElement).append(style);
    }
    style.textContent = `
:root {
  --night-mode-field-background: ${settings.surfaceColor};
  --night-mode-form-background: ${settings.backgroundColor};
  --night-mode-muted-text: ${settings.mutedTextColor};
  --night-mode-field-border: ${settings.borderColor};
  --night-mode-focus-border: #242832;
  --night-mode-focus-line: #05070a;
  --night-mode-focus-ring: #687080;
}
${READABILITY_CSS}`;
  }

  disable(): void {
    if (typeof document === 'undefined') return;
    document.getElementById(STYLE_ID)?.remove();
  }
}
