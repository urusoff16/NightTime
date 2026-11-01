import { blendOver } from '../color/blend';
import { parseColor } from '../color/parse';
import type { BackgroundImageType, ColorValue, TextColorSample } from '../types';

export interface EffectiveBackground {
  color: ColorValue;
  imageType: BackgroundImageType;
  opacity: number;
  confidence: TextColorSample['confidence'];
}

function classifyBackgroundImage(value: string): BackgroundImageType {
  if (value === 'none') return 'none';
  const hasGradient = /(?:repeating-)?(?:linear|radial|conic)-gradient\(/i.test(value);
  const hasImage = /url\(/i.test(value);
  if (hasGradient && hasImage) return 'mixed';
  if (hasGradient) return 'gradient';
  return 'image';
}

function parentElementOrHost(element: Element): Element | null {
  if (element.parentElement) return element.parentElement;
  const root = element.getRootNode();
  return root instanceof ShadowRoot ? (root.host as HTMLElement) : null;
}

export function getEffectiveBackground(
  element: HTMLElement,
  cache = new WeakMap<Element, EffectiveBackground>(),
): EffectiveBackground {
  const chain: HTMLElement[] = [];
  let cachedAncestor: EffectiveBackground | undefined;
  for (let current: Element | null = element; current; current = parentElementOrHost(current)) {
    const cached = cache.get(current);
    if (cached) {
      cachedAncestor = cached;
      break;
    }
    if (!(current instanceof HTMLElement)) break;
    chain.unshift(current);
    if (current === current.ownerDocument.documentElement) break;
  }

  // A transparent document canvas uses the UA canvas. `color-scheme: light dark`
  // means both are supported, so the current media preference selects fallback.
  const rootScheme = getComputedStyle(element.ownerDocument.documentElement)
    .colorScheme.split(/\s+/)
    .filter(Boolean);
  const systemPrefersDark =
    element.ownerDocument.defaultView?.matchMedia('(prefers-color-scheme: dark)').matches ?? false;
  const canvasIsDark =
    rootScheme.includes('dark') && (!rootScheme.includes('light') || systemPrefersDark);
  let color: ColorValue =
    cachedAncestor?.color ??
    (canvasIsDark ? { r: 0, g: 0, b: 0, a: 1 } : { r: 1, g: 1, b: 1, a: 1 });
  let opacity = cachedAncestor?.opacity ?? 1;
  let imageType: BackgroundImageType = cachedAncestor?.imageType ?? 'none';
  let confidence: EffectiveBackground['confidence'] = cachedAncestor?.confidence ?? 'solid';

  for (const node of chain) {
    const style = getComputedStyle(node);
    const layer = parseColor(style.backgroundColor);
    if (layer && layer.a > 0) color = blendOver(layer, color);

    const currentImage = classifyBackgroundImage(style.backgroundImage);
    if (currentImage !== 'none') {
      imageType = imageType === 'none' ? currentImage : 'mixed';
      confidence = 'complex';
    }

    const nodeOpacity = Number.parseFloat(style.opacity);
    if (Number.isFinite(nodeOpacity) && nodeOpacity < 1) {
      opacity *= Math.max(0, nodeOpacity);
      if (confidence !== 'complex') confidence = 'translucent';
    }
    cache.set(node, { color, imageType, opacity, confidence });
  }

  return cache.get(element) ?? { color, imageType, opacity, confidence };
}
