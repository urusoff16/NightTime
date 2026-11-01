import { oklabToSrgb, oklabToSrgbUnclamped, srgbToOklab } from './oklab';
import type { ColorValue, OklchColor } from '../types';

export function srgbToOklch(color: ColorValue): OklchColor {
  const lab = srgbToOklab(color);
  const chroma = Math.hypot(lab.a, lab.b);
  const hue = (Math.atan2(lab.b, lab.a) * 180) / Math.PI;
  return { l: lab.l, c: chroma, h: hue < 0 ? hue + 360 : hue, alpha: color.a };
}

export function oklchToSrgb(color: OklchColor): ColorValue {
  const radians = (color.h * Math.PI) / 180;
  const toSrgb = (chroma: number): ColorValue =>
    oklabToSrgbUnclamped(
      { l: color.l, a: chroma * Math.cos(radians), b: chroma * Math.sin(radians) },
      color.alpha,
    );
  const inGamut = (candidate: ColorValue): boolean =>
    candidate.r >= 0 &&
    candidate.r <= 1 &&
    candidate.g >= 0 &&
    candidate.g <= 1 &&
    candidate.b >= 0 &&
    candidate.b <= 1;

  const raw = toSrgb(color.c);
  if (inGamut(raw)) return raw;

  // Reduce chroma at fixed lightness/hue instead of clipping RGB channels,
  // which otherwise creates visible hue shifts near the gamut boundary.
  let low = 0;
  let high = color.c;
  for (let iteration = 0; iteration < 24; iteration += 1) {
    const midpoint = (low + high) / 2;
    if (inGamut(toSrgb(midpoint))) low = midpoint;
    else high = midpoint;
  }
  return oklabToSrgb(
    { l: color.l, a: low * Math.cos(radians), b: low * Math.sin(radians) },
    color.alpha,
  );
}
