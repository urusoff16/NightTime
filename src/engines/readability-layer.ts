const STYLE_ID = 'night-mode-readability-layer';

export const READABILITY_CSS = `
textarea,
input[type="text"],
input[type="search"],
input[type="email"],
input[type="url"],
input[type="password"] {
  background-color: var(--night-mode-field-background, rgba(30, 35, 47, 0.96)) !important;
  border-color: var(--night-mode-field-border, rgba(151, 157, 168, 0.58)) !important;
  box-shadow: var(--night-mode-field-shadow, inset 0 1px rgba(255, 255, 255, 0.035)) !important;
}

form:has(textarea),
form:has([contenteditable="true"]),
[role="form"]:has(textarea),
[role="form"]:has([contenteditable="true"]) {
  background-color: var(--night-mode-form-background, rgba(22, 26, 35, 0.92)) !important;
  box-shadow: var(--night-mode-form-shadow, 0 0 0 1px rgba(151, 157, 168, 0.46), 0 12px 30px rgba(0, 0, 0, 0.2)) !important;
}

form:has(textarea) button,
form:has([contenteditable="true"]) button,
[role="form"]:has(textarea) button,
[role="form"]:has([contenteditable="true"]) button {
  background-color: var(--night-mode-control-background) !important;
  color: var(--night-mode-control-text) !important;
}

textarea:focus,
input:focus,
[contenteditable="true"]:focus,
[role="textbox"]:focus {
  border-color: rgba(255, 255, 255, 0.95) !important;
  box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.98) !important;
  outline: 0 !important;
}

form:has(textarea:focus),
form:has([contenteditable="true"]:focus),
[role="form"]:has(textarea:focus),
[role="form"]:has([contenteditable="true"]:focus) {
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.86), 0 12px 30px rgba(0, 0, 0, 0.2) !important;
}
`;

export class ReadabilityLayer {
  apply(): void {
    if (typeof document === 'undefined') return;
    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (style === null) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      style.dataset.nightModeLayer = 'readability';
      (document.head ?? document.documentElement).append(style);
    }
    style.textContent = READABILITY_CSS;
  }

  disable(): void {
    if (typeof document === 'undefined') return;
    document.getElementById(STYLE_ID)?.remove();
  }
}
