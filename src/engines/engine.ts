import type { ThemeSettings } from '../shared/settings-model';

export interface ThemeEngine {
  apply(settings: ThemeSettings): void;
  disable(): void;
}
