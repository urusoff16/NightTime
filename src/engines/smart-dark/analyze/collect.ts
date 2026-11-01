import { parseColor } from '../color/parse';
import type { BackgroundImageType, SemanticRole, TextColorSample } from '../types';
import { getEffectiveBackground } from './effective-background';

export interface CollectionBudget {
  softElementBudget: number;
  hardElementBudget: number;
}

export const DEFAULT_COLLECTION_BUDGET: Readonly<CollectionBudget> = {
  softElementBudget: 1500,
  hardElementBudget: 5000,
};

const IGNORED_ANCESTORS = [
  'script',
  'style',
  'noscript',
  'svg',
  'canvas',
  'video',
  'audio',
  'picture',
  'pre',
  'code',
  '[hidden]',
  '[inert]',
  '[aria-hidden="true"]',
  '[data-night-mode-layer]',
  '[data-darkreader]',
  '[data-nighttime-smart-dark-target]',
].join(',');

function shadowParent(element: HTMLElement): HTMLElement | null {
  if (element.parentElement) return element.parentElement;
  const root = element.getRootNode();
  return typeof ShadowRoot !== 'undefined' && root instanceof ShadowRoot
    ? (root.host as HTMLElement)
    : null;
}

function isHiddenByAncestor(element: HTMLElement): boolean {
  for (let current: HTMLElement | null = element; current; current = shadowParent(current)) {
    const style = getComputedStyle(current);
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.visibility === 'collapse' ||
      current.matches(':disabled, [aria-disabled="true"]') ||
      current.closest(IGNORED_ANCESTORS)
    ) {
      return true;
    }
  }
  return false;
}

function isNearViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0 || element.getClientRects().length === 0) return false;
  const style = getComputedStyle(element);
  if (style.position === 'fixed' || style.position === 'sticky') return true;
  const view = element.ownerDocument.defaultView;
  if (!view) return false;
  return (
    rect.bottom >= 0 &&
    rect.right >= 0 &&
    rect.top <= view.innerHeight &&
    rect.left <= view.innerWidth
  );
}

function semanticRole(element: HTMLElement): SemanticRole {
  if (element.matches('a[href], [role="link"]')) return 'link';
  if (element.matches('button, [role="button"]')) return 'button';
  if (element.matches('input, textarea, select, [role="textbox"], [role="searchbox"]')) {
    return 'input';
  }
  if (element.matches('svg, [role="img"]')) return 'icon';
  const style = getComputedStyle(element);
  if (
    element.matches('small, [aria-description], [data-testid*="caption" i]') ||
    Number.parseFloat(style.fontSize) <= 14 ||
    Number.parseFloat(style.opacity) < 1
  ) {
    return 'text-secondary';
  }
  return 'text-primary';
}

function backgroundImageType(value: string): BackgroundImageType {
  if (value === 'none') return 'none';
  const gradient = /(?:repeating-)?(?:linear|radial|conic)-gradient\(/i.test(value);
  const image = /url\(|image-set\(/i.test(value);
  if (gradient && image) return 'mixed';
  return gradient ? 'gradient' : 'image';
}

function isLargeText(style: CSSStyleDeclaration): boolean {
  const size = Number.parseFloat(style.fontSize);
  const weight = Number.parseInt(style.fontWeight, 10) || 400;
  return size >= 24 || (size >= 18.66 && weight >= 700);
}

interface RootCursor {
  textWalker: TreeWalker;
  elementWalker: TreeWalker;
  textDone: boolean;
  elementDone: boolean;
  preferText: boolean;
}

function createCursor(root: Document | ShadowRoot | HTMLElement): RootCursor {
  const document = root instanceof Document ? root : root.ownerDocument;
  return {
    textWalker: document.createTreeWalker(root, NodeFilter.SHOW_TEXT),
    elementWalker: document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT),
    textDone: false,
    elementDone: false,
    preferText: true,
  };
}

function sampleTextNode(
  textNode: Node,
  samples: Map<HTMLElement, TextColorSample>,
  backgroundCache: WeakMap<Element, ReturnType<typeof getEffectiveBackground>>,
): void {
  if (!textNode.textContent?.trim()) return;
  const element = textNode.parentElement;
  if (
    !element ||
    !(element instanceof HTMLElement) ||
    isHiddenByAncestor(element) ||
    !isNearViewport(element)
  ) {
    return;
  }

  const style = getComputedStyle(element);
  const foreground = parseColor(style.color);
  if (!foreground || foreground.a <= 0) return;

  const background = getEffectiveBackground(element, backgroundCache);
  const rect = element.getBoundingClientRect();
  const fontSize = Number.parseFloat(style.fontSize) || 16;
  const fontWeight = Number.parseInt(style.fontWeight, 10) || 400;
  samples.set(element, {
    element,
    foreground,
    background: background.color,
    effectiveOpacity: background.opacity,
    fontSize,
    fontWeight,
    area: Math.max(1, rect.width * rect.height),
    viewportPriority: style.position === 'fixed' || style.position === 'sticky',
    role: semanticRole(element),
    backgroundImageType:
      background.imageType === 'none'
        ? backgroundImageType(style.backgroundImage)
        : background.imageType,
    confidence: background.confidence,
    largeText: isLargeText(style),
  });
}

/** Stateful bounded scanner so callers can spend a small DOM-read budget per idle turn. */
export class VisibleTextCollector {
  private readonly samples = new Map<HTMLElement, TextColorSample>();
  private readonly sampledElements = new Set<HTMLElement>();
  private readonly roots: RootCursor[];
  private readonly seenRoots = new Set<ShadowRoot>();
  private readonly backgroundCache = new WeakMap<
    Element,
    ReturnType<typeof getEffectiveBackground>
  >();
  private visited = 0;
  private readonly hardBudget: number;
  lastWorkUnits = 0;

  constructor(
    root: Document | ShadowRoot | HTMLElement,
    budget: CollectionBudget = DEFAULT_COLLECTION_BUDGET,
  ) {
    this.roots = [createCursor(root)];
    // TreeWalker starts before an Element root and therefore does not yield it.
    // Explicitly queue that host's own open root for incremental host scans.
    if (root instanceof HTMLElement && root.shadowRoot) {
      this.seenRoots.add(root.shadowRoot);
      this.roots.push(createCursor(root.shadowRoot));
    }
    this.hardBudget = Math.max(1, Math.floor(budget.hardElementBudget));
  }

  get complete(): boolean {
    return this.roots.length === 0 || this.visited >= this.hardBudget;
  }

  getAllSamples(): TextColorSample[] {
    return [...this.samples.values()].sort(
      (first, second) =>
        Number(second.viewportPriority) - Number(first.viewportPriority) ||
        second.area - first.area,
    );
  }

  take(workBudget: number): TextColorSample[] {
    const initialSize = this.samples.size;
    let work = 0;
    const limit = Math.max(1, Math.floor(workBudget));
    while (this.roots.length > 0 && this.visited < this.hardBudget && work < limit) {
      const cursor = this.roots[this.roots.length - 1];
      if (!cursor) break;

      if (!cursor.textDone && (cursor.preferText || cursor.elementDone)) {
        const textNode = cursor.textWalker.nextNode();
        if (textNode) {
          this.visited += 1;
          work += 1;
          cursor.preferText = false;
          const element = textNode.parentElement;
          if (element && !this.sampledElements.has(element)) {
            this.sampledElements.add(element);
            sampleTextNode(textNode, this.samples, this.backgroundCache);
          }
          continue;
        }
        cursor.textDone = true;
      }

      if (!cursor.elementDone && (cursor.textDone || !cursor.preferText)) {
        const node = cursor.elementWalker.nextNode();
        if (!node) {
          cursor.elementDone = true;
        } else {
          this.visited += 1;
          work += 1;
          cursor.preferText = true;
          const shadow = (node as HTMLElement).shadowRoot;
          if (shadow && !this.seenRoots.has(shadow)) {
            this.seenRoots.add(shadow);
            this.roots.push(createCursor(shadow));
          }
          continue;
        }
      }
      if (cursor.textDone && cursor.elementDone) {
        this.roots.pop();
        continue;
      }
    }
    this.lastWorkUnits = work;
    return [...this.samples.values()].slice(initialSize);
  }
}

/** Collects a bounded, visible-only sample; it never returns page text or retains CSSStyleDeclaration. */
export function collectVisibleTextSamples(
  document: Document,
  budget: CollectionBudget = DEFAULT_COLLECTION_BUDGET,
): TextColorSample[] {
  const softBudget = Math.max(1, Math.floor(budget.softElementBudget));
  const collector = new VisibleTextCollector(document, {
    softElementBudget: softBudget,
    hardElementBudget: Math.max(softBudget, Math.floor(budget.hardElementBudget)),
  });
  while (!collector.complete) collector.take(200);
  return collector.getAllSamples().slice(0, softBudget);
}
