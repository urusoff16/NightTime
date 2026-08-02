import { disable, enable, setFetchMethod } from 'darkreader';

import type { ThemeSettings } from '../shared/settings-model';
import type { ThemeEngine } from './engine';

export class SmartEngine implements ThemeEngine {
  apply(settings: ThemeSettings): void {
    setFetchMethod((url) => globalThis.fetch(url));

    const cspSafeFixes = {
      invert: [],
      css: '',
      ignoreInlineStyle: [],
      ignoreImageAnalysis: [],
      disableStyleSheetsProxy: true,
      disableCustomElementRegistryProxy: true,
      ignoreCSSUrl: [],
    } as NonNullable<Parameters<typeof enable>[1]> & {
      disableCustomElementRegistryProxy: boolean;
    };

    enable(
      {
        brightness: settings.brightness,
        contrast: settings.contrast,
        sepia: settings.warmth,
        grayscale: settings.grayscale,
        darkSchemeBackgroundColor: settings.backgroundColor,
        darkSchemeTextColor: settings.textColor,
      },
      cspSafeFixes,
    );
  }

  disable(): void {
    disable();
  }
}
