import type { EngineMode, ThemeSettings } from './settings-model';

export type ContentCommand =
  | { type: 'NIGHT_MODE_ENABLE'; settings: Partial<ThemeSettings> }
  | { type: 'NIGHT_MODE_DISABLE' }
  | { type: 'NIGHT_MODE_REFRESH_SETTINGS' }
  | { type: 'NIGHT_MODE_GET_STATE' };

export interface ContentState {
  enabled: boolean;
  engine: EngineMode | null;
  brightness: number | null;
  contrast: number | null;
}

export interface MessageResult<T> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export function isContentCommand(value: unknown): value is ContentCommand {
  if (value === null || typeof value !== 'object' || !('type' in value)) {
    return false;
  }

  return [
    'NIGHT_MODE_ENABLE',
    'NIGHT_MODE_DISABLE',
    'NIGHT_MODE_REFRESH_SETTINGS',
    'NIGHT_MODE_GET_STATE',
  ].includes(value.type as string);
}
