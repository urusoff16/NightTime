import { EngineManager } from '../engines/engine-manager';
import type { ContentState } from '../shared/messages';
import {
  DEFAULT_THEME_SETTINGS,
  type EngineMode,
  type ThemeSettings,
} from '../shared/settings-model';
import { normalizeThemeSettings } from '../shared/settings-validation';

function themesEqual(first: ThemeSettings | null, second: ThemeSettings): boolean {
  if (first === null) return false;
  return (Object.keys(second) as Array<keyof ThemeSettings>).every(
    (key) => first[key] === second[key],
  );
}

export class ThemeController {
  private readonly engineManager = new EngineManager();
  private active = false;
  private activeEngine: EngineMode | null = null;
  private appliedSettings: ThemeSettings | null = null;

  apply(settings: Partial<ThemeSettings>, engine: EngineMode = 'smart'): ContentState {
    const nextSettings = normalizeThemeSettings(settings);

    if (
      !this.active ||
      this.activeEngine !== engine ||
      !themesEqual(this.appliedSettings, nextSettings)
    ) {
      const applied = this.engineManager.apply(engine, nextSettings);
      this.activeEngine = applied.engine;
      this.appliedSettings = nextSettings;
    }

    this.active = true;
    return this.getState();
  }

  disable(): ContentState {
    if (this.active) this.engineManager.disable();
    this.active = false;
    this.activeEngine = null;
    this.appliedSettings = null;
    return this.getState();
  }

  getState(): ContentState {
    return {
      enabled: this.active,
      engine: this.activeEngine,
      brightness: this.appliedSettings?.brightness ?? null,
      contrast: this.appliedSettings?.contrast ?? null,
    };
  }

  applyDefaultSettings(): ContentState {
    return this.apply(DEFAULT_THEME_SETTINGS);
  }
}
