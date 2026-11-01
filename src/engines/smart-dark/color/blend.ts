import type { ColorValue } from '../types';

/** Composites an sRGB foreground over an opaque sRGB background. */
export function blendOver(foreground: ColorValue, background: ColorValue): ColorValue {
  const alpha = Math.min(1, Math.max(0, foreground.a));
  const backgroundAlpha = Math.min(1, Math.max(0, background.a));
  const outAlpha = alpha + backgroundAlpha * (1 - alpha);
  if (outAlpha === 0) return { r: 0, g: 0, b: 0, a: 0 };
  return {
    r: (foreground.r * alpha + background.r * backgroundAlpha * (1 - alpha)) / outAlpha,
    g: (foreground.g * alpha + background.g * backgroundAlpha * (1 - alpha)) / outAlpha,
    b: (foreground.b * alpha + background.b * backgroundAlpha * (1 - alpha)) / outAlpha,
    a: outAlpha,
  };
}
