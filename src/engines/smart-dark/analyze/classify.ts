import { contrastRatio } from '../color/contrast';
import { srgbToOklab } from '../color/oklab';
import { TEXT_CONTRAST_TARGET } from '../color/transform';
import { clusterColors } from './cluster-colors';
import type { ContrastIssue, PageThemeReport, TextColorSample } from '../types';

const DARK_SURFACE_LIMIT = 0.32;
const LIGHT_SURFACE_LIMIT = 0.72;

function luminance(color: TextColorSample['background']): number {
  const linear = (value: number): number =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  return 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b);
}

export function createPageColorReport(samples: TextColorSample[]): PageThemeReport {
  if (samples.length === 0) {
    return {
      kind: 'mixed',
      darknessScore: 0,
      coverage: { dark: 0, medium: 0, light: 0 },
      sampledElements: 0,
      uniqueColors: 0,
      colorClusters: { foreground: [], background: [] },
      issues: [],
    };
  }

  const coverage = { dark: 0, medium: 0, light: 0 };
  let totalWeight = 0;
  let darknessTotal = 0;
  const colors = new Set<string>();
  const issues: ContrastIssue[] = [];
  const foregroundColors = samples.map((sample) => ({
    color: sample.foreground,
    role: sample.role,
    area: sample.area,
  }));
  const backgroundColors: Array<{
    color: TextColorSample['background'];
    role: TextColorSample['role'];
    area: number;
  }> = [];
  for (const sample of samples) {
    // A CSS color under an image, gradient, or opacity layer is not the actual
    // visible surface; do not let that fallback color classify the whole page.
    if (
      sample.confidence !== 'solid' ||
      sample.backgroundImageType !== 'none' ||
      sample.effectiveOpacity < 0.999
    ) {
      continue;
    }

    const weight = Math.max(1, sample.area);
    backgroundColors.push({ color: sample.background, role: sample.role, area: weight });
    const lightness = srgbToOklab(sample.background).l;
    const brightness = luminance(sample.background);
    if (brightness <= DARK_SURFACE_LIMIT) coverage.dark += weight;
    else if (brightness >= LIGHT_SURFACE_LIMIT) coverage.light += weight;
    else coverage.medium += weight;
    totalWeight += weight;
    darknessTotal += (1 - lightness) * weight;
    colors.add(
      [sample.background.r, sample.background.g, sample.background.b]
        .map((value) => Math.round(value * 32))
        .join(':'),
    );
    // Keep contrast calculation in the report pipeline so each sample is
    // evaluated against its local, composited surface, not the page canvas.
    const ratio = contrastRatio(sample.foreground, sample.background);
    const target = sample.largeText ? TEXT_CONTRAST_TARGET.large : TEXT_CONTRAST_TARGET.normal;
    if (ratio < target) issues.push({ role: sample.role, ratio, target });
  }

  if (totalWeight === 0) {
    return {
      kind: 'mixed',
      darknessScore: 0,
      coverage: { dark: 0, medium: 0, light: 0 },
      sampledElements: samples.length,
      uniqueColors: 0,
      colorClusters: { foreground: clusterColors(foregroundColors), background: [] },
      issues,
    };
  }

  const darknessScore = darknessTotal / totalWeight;
  for (const key of Object.keys(coverage) as Array<keyof typeof coverage>) {
    coverage[key] /= totalWeight;
  }
  const kind = coverage.dark >= 0.75 ? 'dark' : coverage.light >= 0.6 ? 'light' : 'mixed';

  return {
    kind,
    darknessScore,
    coverage,
    sampledElements: samples.length,
    uniqueColors: colors.size,
    colorClusters: {
      foreground: clusterColors(foregroundColors),
      background: clusterColors(backgroundColors),
    },
    issues,
  };
}
