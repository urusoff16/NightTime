import { ensureContrast } from './contrast';
import type { ColorValue, ContrastAdjustment } from '../types';

export const TEXT_CONTRAST_TARGET = {
  normal: 4.5,
  large: 3,
} as const;

export function correctTextColor(
  foreground: ColorValue,
  effectiveBackground: ColorValue,
  largeText: boolean,
): ContrastAdjustment {
  return ensureContrast(
    foreground,
    effectiveBackground,
    largeText ? TEXT_CONTRAST_TARGET.large : TEXT_CONTRAST_TARGET.normal,
  );
}
