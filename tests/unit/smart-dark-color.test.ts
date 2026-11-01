import { describe, expect, it } from 'vitest';

import { blendOver } from '../../src/engines/smart-dark/color/blend';
import { contrastRatio, ensureContrast } from '../../src/engines/smart-dark/color/contrast';
import { parseColor, serializeColor } from '../../src/engines/smart-dark/color/parse';
import { oklchToSrgb, srgbToOklch } from '../../src/engines/smart-dark/color/oklch';
import { oklabToSrgb, srgbToOklab } from '../../src/engines/smart-dark/color/oklab';
import { correctTextColor } from '../../src/engines/smart-dark/color/transform';
import type { ColorValue } from '../../src/engines/smart-dark/types';
import { createPageColorReport } from '../../src/engines/smart-dark/analyze/classify';

const color = (hex: string): ColorValue => {
  const parsed = parseColor(hex);
  if (!parsed) throw new Error(`Test color did not parse: ${hex}`);
  return parsed;
};

describe('Smart Dark color math', () => {
  it('parses hex, RGB, percentage channels, alpha, and transparent', () => {
    expect(parseColor('#369')).toEqual({ r: 0.2, g: 0.4, b: 0.6, a: 1 });
    expect(parseColor('#33669980')?.a).toBeCloseTo(128 / 255, 5);
    expect(parseColor('rgba(255, 0, 128, 0.25)')).toEqual({ r: 1, g: 0, b: 128 / 255, a: 0.25 });
    expect(parseColor('rgb(100% 0% 50% / 25%)')).toEqual({ r: 1, g: 0, b: 0.5, a: 0.25 });
    expect(parseColor('transparent')).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    expect(parseColor('var(--surface)')).toBeNull();
  });

  it('composites alpha layers in order', () => {
    expect(blendOver({ r: 1, g: 0, b: 0, a: 0.5 }, { r: 0, g: 0, b: 1, a: 1 })).toMatchObject({
      r: 0.5,
      g: 0,
      b: 0.5,
      a: 1,
    });
    expect(blendOver({ r: 1, g: 0, b: 0, a: 0.5 }, { r: 0, g: 0, b: 0, a: 0 })).toMatchObject({
      r: 1,
      g: 0,
      b: 0,
      a: 0.5,
    });
  });

  it('round trips common colors through OKLab and OKLCH', () => {
    for (const hex of ['#f23c61', '#336699', '#1a1a1a', '#f4e6c8']) {
      const source = color(hex);
      const labRoundTrip = oklabToSrgb(srgbToOklab(source));
      expect(labRoundTrip.r).toBeCloseTo(source.r, 4);
      expect(labRoundTrip.g).toBeCloseTo(source.g, 4);
      expect(labRoundTrip.b).toBeCloseTo(source.b, 4);
      const roundTrip = oklchToSrgb(srgbToOklch(source));
      expect(roundTrip.r).toBeCloseTo(source.r, 4);
      expect(roundTrip.g).toBeCloseTo(source.g, 4);
      expect(roundTrip.b).toBeCloseTo(source.b, 4);
    }
  });

  it('calculates standard black-white contrast and accounts for alpha', () => {
    expect(contrastRatio(color('#fff'), color('#000'))).toBeCloseTo(21, 5);
    expect(contrastRatio(color('rgba(255, 255, 255, 0.35)'), color('#111'))).toBeLessThan(4.5);
    expect(contrastRatio(color('#fff'), color('#000'), color('rgba(0,0,0,0.5)'))).toBeLessThan(6);
  });

  it('does not claim reliable contrast for translucent or image-backed samples', () => {
    const sample = {
      element: {} as HTMLElement,
      foreground: color('#666'),
      background: color('#151515'),
      effectiveOpacity: 0.7,
      fontSize: 14,
      fontWeight: 400,
      area: 100,
      viewportPriority: false,
      role: 'text-secondary' as const,
      backgroundImageType: 'image' as const,
      confidence: 'complex' as const,
      largeText: false,
    };
    expect(createPageColorReport([sample]).issues).toEqual([]);
  });

  it('lightens low-contrast text while retaining its accent hue', () => {
    const source = color('#54669c');
    const background = color('#242830');
    const result = ensureContrast(source, background, 4.5);
    expect(result.reachable).toBe(true);
    expect(result.changed).toBe(true);
    expect(result.after).toBeGreaterThanOrEqual(4.49);
    expect(Math.abs(srgbToOklch(result.color).h - srgbToOklch(source).h)).toBeLessThan(0.1);
  });

  it('leaves readable colors alone and raises faint text alpha only as far as needed', () => {
    const readable = correctTextColor(color('#fff'), color('#111'), false);
    expect(readable).toMatchObject({ changed: false, reachable: true });

    const faint = ensureContrast(color('rgba(255,255,255,0.1)'), color('#111'), 4.5);
    expect(faint).toMatchObject({ changed: true, reachable: true, alphaAdjusted: true });
    expect(faint.after).toBeGreaterThanOrEqual(4.49);
    expect(faint.color.a).toBeLessThan(1);
    expect(
      Math.abs(srgbToOklch(faint.color).h - srgbToOklch(color('rgba(90,90,90,0.1)')).h),
    ).toBeLessThan(2);
  });

  it('keeps serialized, gamut-mapped alpha text above its requested contrast', () => {
    const source = { r: 121 / 255, g: 147 / 255, b: 188 / 255, a: 0.12 };
    const background = color('#0c0e14');
    const result = ensureContrast(source, background, 4.5);
    expect(result.changed).toBe(true);
    expect(contrastRatio(result.color, background)).toBeGreaterThanOrEqual(4.49);
  });

  it('serializes generated colors as clamped CSS RGB', () => {
    expect(serializeColor({ r: 1, g: 0.5, b: 0, a: 0.25 })).toBe('rgb(255 128 0 / 0.25)');
  });

  it('classifies sampled page surfaces and reports local low-contrast text', () => {
    const baseSample = {
      element: {} as HTMLElement,
      foreground: color('#666'),
      effectiveOpacity: 1,
      fontSize: 14,
      fontWeight: 400,
      area: 100,
      viewportPriority: false,
      role: 'text-secondary' as const,
      backgroundImageType: 'none' as const,
      confidence: 'solid' as const,
      largeText: false,
    };
    const report = createPageColorReport([
      { ...baseSample, background: color('#151515') },
      { ...baseSample, background: color('#f7f7f7') },
    ]);
    expect(report.kind).toBe('mixed');
    expect(report.coverage.dark).toBeCloseTo(0.5);
    expect(report.coverage.light).toBeCloseTo(0.5);
    expect(report.issues).toEqual([
      { role: 'text-secondary', ratio: expect.any(Number), target: 4.5 },
    ]);
  });

  it('does not infer the page canvas from image-backed or translucent samples', () => {
    const baseSample = {
      element: {} as HTMLElement,
      foreground: color('#666'),
      background: color('#fff'),
      effectiveOpacity: 1,
      fontSize: 14,
      fontWeight: 400,
      area: 100,
      viewportPriority: false,
      role: 'text-secondary' as const,
      largeText: false,
    };
    const report = createPageColorReport([
      {
        ...baseSample,
        backgroundImageType: 'image' as const,
        confidence: 'complex' as const,
      },
      {
        ...baseSample,
        background: color('#000'),
        backgroundImageType: 'none' as const,
        confidence: 'translucent' as const,
        effectiveOpacity: 0.7,
      },
    ]);

    expect(report).toMatchObject({
      kind: 'mixed',
      darknessScore: 0,
      coverage: { dark: 0, medium: 0, light: 0 },
      sampledElements: 2,
      uniqueColors: 0,
    });
  });

  it('classifies reliable all-dark and all-light samples consistently', () => {
    const baseSample = {
      element: {} as HTMLElement,
      foreground: color('#888'),
      effectiveOpacity: 1,
      fontSize: 16,
      fontWeight: 400,
      area: 100,
      viewportPriority: false,
      role: 'text-primary' as const,
      backgroundImageType: 'none' as const,
      confidence: 'solid' as const,
      largeText: false,
    };

    expect(createPageColorReport([{ ...baseSample, background: color('#151515') }]).kind).toBe(
      'dark',
    );
    expect(createPageColorReport([{ ...baseSample, background: color('#f7f7f7') }]).kind).toBe(
      'light',
    );
  });

  it('clusters nearby foreground colors by perceptual distance and retains role weights', () => {
    const baseSample = {
      element: {} as HTMLElement,
      background: color('#17191e'),
      effectiveOpacity: 1,
      fontSize: 16,
      fontWeight: 400,
      viewportPriority: false,
      backgroundImageType: 'none' as const,
      confidence: 'solid' as const,
      largeText: false,
    };
    const samples = [
      {
        ...baseSample,
        foreground: color('#3565a8'),
        area: 100,
        role: 'link' as const,
      },
      {
        ...baseSample,
        foreground: color('#3869ac'),
        area: 200,
        role: 'link' as const,
      },
      {
        ...baseSample,
        foreground: color('#c54825'),
        area: 50,
        role: 'text-primary' as const,
      },
    ];
    const report = createPageColorReport(samples);
    const reversedReport = createPageColorReport([...samples].reverse());
    const linkCluster = report.colorClusters.foreground.find((cluster) => cluster.roles.link === 2);

    expect(report.colorClusters.foreground).toHaveLength(2);
    expect(reversedReport.colorClusters).toEqual(report.colorClusters);
    expect(linkCluster).toMatchObject({ sampleCount: 2, sampledArea: 300, roles: { link: 2 } });
    expect(report.colorClusters.background).toHaveLength(1);
    expect(report.colorClusters.background[0]).toMatchObject({
      sampleCount: 3,
      sampledArea: 350,
    });
  });
});
