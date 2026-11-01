import { blendOver } from './blend';
import { oklchToSrgb, srgbToOklch } from './oklch';
import type { ColorValue, ContrastAdjustment } from '../types';

function luminance(color: ColorValue): number {
  const linear = (channel: number): number =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  return 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b);
}

export function contrastRatio(
  foreground: ColorValue,
  background: ColorValue,
  finalOverlay?: ColorValue,
): number {
  const opaqueBackground = blendOver(background, { r: 1, g: 1, b: 1, a: 1 });
  const visibleForeground = blendOver(foreground, opaqueBackground);
  const finalForeground = finalOverlay
    ? blendOver(finalOverlay, visibleForeground)
    : visibleForeground;
  const finalBackground = finalOverlay
    ? blendOver(finalOverlay, opaqueBackground)
    : opaqueBackground;
  const first = luminance(finalForeground);
  const second = luminance(finalBackground);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function findLightness(
  lightness: number,
  chroma: number,
  hue: number,
  alpha: number,
  background: ColorValue,
  finalOverlay: ColorValue | undefined,
  minimumRatio: number,
  lighten: boolean,
): ColorValue | null {
  let failing = lighten ? lightness : 0;
  let passing = lighten ? 1 : lightness;
  const endpoint = oklchToSrgb({ l: passing, c: chroma, h: hue, alpha });
  if (contrastRatio(endpoint, background, finalOverlay) < minimumRatio) return null;

  for (let iteration = 0; iteration < 28; iteration += 1) {
    const candidateLightness = (failing + passing) / 2;
    const candidate = oklchToSrgb({ l: candidateLightness, c: chroma, h: hue, alpha });
    if (contrastRatio(candidate, background, finalOverlay) >= minimumRatio) {
      passing = candidateLightness;
    } else {
      failing = candidateLightness;
    }
  }
  return oklchToSrgb({ l: passing, c: chroma, h: hue, alpha });
}

function closestPassingColor(
  lightness: number,
  chroma: number,
  hue: number,
  alpha: number,
  background: ColorValue,
  finalOverlay: ColorValue | undefined,
  minimumRatio: number,
): ColorValue | null {
  const candidates = [
    findLightness(lightness, chroma, hue, alpha, background, finalOverlay, minimumRatio, true),
    findLightness(lightness, chroma, hue, alpha, background, finalOverlay, minimumRatio, false),
  ].filter((candidate): candidate is ColorValue => candidate !== null);
  return (
    candidates.sort(
      (first, second) =>
        Math.abs(srgbToOklch(first).l - lightness) - Math.abs(srgbToOklch(second).l - lightness),
    )[0] ?? null
  );
}

/** Minimally changes OKLCH lightness while preserving the source color's hue and chroma. */
export function ensureContrast(
  foreground: ColorValue,
  background: ColorValue,
  minimumRatio: number,
  finalOverlay?: ColorValue,
): ContrastAdjustment {
  const before = contrastRatio(foreground, background, finalOverlay);
  if (before >= minimumRatio) {
    return {
      color: foreground,
      before,
      after: before,
      changed: false,
      reachable: true,
      alphaAdjusted: false,
    };
  }

  const source = srgbToOklch(foreground);
  let chosenAlpha = source.alpha;
  let best = closestPassingColor(
    source.l,
    source.c,
    source.h,
    chosenAlpha,
    background,
    finalOverlay,
    minimumRatio,
  );

  // If changing lightness alone cannot reach the target, raise only the text
  // color's own alpha as little as necessary. Ancestor opacity is handled by
  // the analyzer and such ambiguous samples are not modified.
  if (!best && chosenAlpha < 1) {
    let failingAlpha = chosenAlpha;
    let passingAlpha: number | null = null;
    for (let step = 1; step <= 16; step += 1) {
      const candidateAlpha = chosenAlpha + ((1 - chosenAlpha) * step) / 16;
      if (
        closestPassingColor(
          source.l,
          source.c,
          source.h,
          candidateAlpha,
          background,
          finalOverlay,
          minimumRatio,
        )
      ) {
        passingAlpha = candidateAlpha;
        break;
      }
      failingAlpha = candidateAlpha;
    }
    if (passingAlpha !== null) {
      let lowAlpha = failingAlpha;
      let highAlpha = passingAlpha;
      for (let iteration = 0; iteration < 14; iteration += 1) {
        const midpoint: number = (lowAlpha + highAlpha) / 2;
        const candidate = closestPassingColor(
          source.l,
          source.c,
          source.h,
          midpoint,
          background,
          finalOverlay,
          minimumRatio,
        );
        if (candidate) highAlpha = midpoint;
        else lowAlpha = midpoint;
      }
      chosenAlpha = highAlpha;
      best = closestPassingColor(
        source.l,
        source.c,
        source.h,
        chosenAlpha,
        background,
        finalOverlay,
        minimumRatio,
      );
    }
  }

  if (!best) {
    return {
      color: foreground,
      before,
      after: before,
      changed: false,
      reachable: false,
      alphaAdjusted: false,
    };
  }
  return {
    color: best,
    before,
    after: contrastRatio(best, background, finalOverlay),
    changed: true,
    reachable: true,
    alphaAdjusted: chosenAlpha > source.alpha + 1e-4,
  };
}
