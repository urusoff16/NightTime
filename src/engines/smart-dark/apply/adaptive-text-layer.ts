import { createPageColorReport } from '../analyze/classify';
import { DEFAULT_COLLECTION_BUDGET, VisibleTextCollector } from '../analyze/collect';
import { ensureContrast } from '../color/contrast';
import { parseColor, serializeColor } from '../color/parse';
import { dimmingColor } from '../../dimming-overlay';
import type { PageThemeReport, TextColorSample } from '../types';
import type { ThemeSettings } from '../../../shared/settings-model';

const TARGET_ATTRIBUTE = 'data-nighttime-smart-dark-target';
const TARGET_LIMIT = 1500;
const WORK_PER_IDLE_TURN = 120;
const ATTRIBUTE_FILTER = ['style', 'class', 'hidden', 'aria-hidden', 'disabled'];

interface TargetState {
  token: string;
  originalAttribute: string | null;
  appliedAttribute: string;
  originalColor: string;
  originalColorPriority: string;
  appliedColor: string;
  appliedStyleAttribute: string;
  color: string;
}

interface PendingTask {
  kind: 'idle' | 'timeout';
  handle: number;
  view: Window;
}

function textTarget(sample: TextColorSample): boolean {
  if (!(
    sample.confidence === 'solid' &&
    sample.backgroundImageType === 'none' &&
    sample.effectiveOpacity >= 0.999 &&
    sample.role !== 'icon'
  ))
    return false;

  // Do not flatten interactive/status colors which communicate state rather than readability.
  for (let current: HTMLElement | null = sample.element; current; current = current.parentElement) {
    if (
      current.matches(
        ':disabled, :focus, [aria-disabled="true"], [aria-selected="true"], [aria-pressed="true"], [aria-checked="true"], [aria-current], [aria-invalid="true"], [role="alert"], [role="status"], [role="progressbar"]',
      )
    ) {
      return false;
    }
    if (!current.parentElement && typeof ShadowRoot !== 'undefined') {
      const root = current.getRootNode();
      if (root instanceof ShadowRoot && root.host instanceof HTMLElement) current = root.host;
    }
  }
  return true;
}

function belongsToSubtree(root: Node, element: HTMLElement): boolean {
  let current: Node | null = element;
  while (current) {
    if (current === root) return true;
    const parent: Node | null = current.parentNode;
    if (parent === root) return true;
    current =
      typeof ShadowRoot !== 'undefined' && parent instanceof ShadowRoot
        ? parent.host
        : parent;
  }
  return false;
}

/** Applies reversible, element-scoped color corrections after the base engine. */
export class AdaptiveTextLayer {
  private document: Document | null = null;
  private settings: ThemeSettings | null = null;
  private observer: MutationObserver | null = null;
  private collectorQueue: VisibleTextCollector[] = [];
  private activeCollector: VisibleTextCollector | null = null;
  private pendingRoots = new Set<Node>();
  private readonly samples = new Map<HTMLElement, TextColorSample>();
  private readonly targets = new Map<HTMLElement, TargetState>();
  private nextTargetId = 0;
  private tokenPrefix = '';
  private generation = 0;
  private scheduledTask: PendingTask | null = null;
  private mutationTimer: number | null = null;
  private observerStarted = false;
  private lastReport: PageThemeReport | null = null;

  getReport(): PageThemeReport | null {
    return this.lastReport;
  }

  apply(settings: ThemeSettings): void {
    this.disable();
    const document = globalThis.document;
    if (!document?.documentElement || !document.defaultView) return;

    this.document = document;
    this.settings = settings;
    this.generation += 1;
    this.tokenPrefix = `ntsd_${Math.random().toString(36).slice(2, 10)}`;
    this.samples.clear();
    this.targets.clear();
    this.pendingRoots.clear();
    this.collectorQueue = [new VisibleTextCollector(document, DEFAULT_COLLECTION_BUDGET)];
    this.activeCollector = null;
    this.lastReport = null;
    const generation = this.generation;
    this.processBatch(generation, 48);
    if (!this.isScanComplete()) this.scheduleBatch(generation);
    this.beginObserving();
  }

  disable(): void {
    this.generation += 1;
    this.cancelScheduledWork();
    if (this.mutationTimer !== null && this.document?.defaultView) {
      this.document.defaultView.clearTimeout(this.mutationTimer);
    }
    this.mutationTimer = null;
    this.observer?.disconnect();
    this.observer = null;
    this.observerStarted = false;

    for (const element of this.targets.keys()) this.removeTarget(element);
    this.document = null;
    this.settings = null;
    this.activeCollector = null;
    this.collectorQueue = [];
    this.pendingRoots.clear();
    this.samples.clear();
    this.targets.clear();
  }

  private isScanComplete(): boolean {
    return this.activeCollector === null && this.collectorQueue.length === 0;
  }

  private processBatch(generation: number, workBudget: number): void {
    if (generation !== this.generation || !this.document || !this.settings) return;
    try {
      let remainingWork = workBudget;
      const newTargets: Array<[HTMLElement, TargetState]> = [];
      while (remainingWork > 0) {
        if (!this.activeCollector) {
          const root = this.pendingRoots.values().next().value as Node | undefined;
          if (root) {
            this.pendingRoots.delete(root);
            if (
              root instanceof Document ||
              root instanceof ShadowRoot ||
              root instanceof HTMLElement
            ) {
              this.collectorQueue.push(
                new VisibleTextCollector(root, {
                  softElementBudget: DEFAULT_COLLECTION_BUDGET.softElementBudget,
                  hardElementBudget: Math.min(DEFAULT_COLLECTION_BUDGET.hardElementBudget, 700),
                }),
              );
            }
          }
          this.activeCollector = this.collectorQueue.shift() ?? null;
          if (!this.activeCollector) break;
        }

        const batch = this.activeCollector.take(remainingWork);
        remainingWork -= this.activeCollector.lastWorkUnits;
        for (const sample of batch) {
          this.samples.set(sample.element, sample);
          const state = this.correctSample(sample);
          if (state) newTargets.push([sample.element, state]);
          else if (this.targets.has(sample.element)) {
            this.removeTarget(sample.element);
          }
        }
        if (this.activeCollector.complete) this.activeCollector = null;
        else if (batch.length === 0) break;
      }

      for (const [element, state] of newTargets) this.installTarget(element, state);
      if (this.isScanComplete()) {
        this.lastReport = createPageColorReport([...this.samples.values()]);
        if (!this.observerStarted) this.beginObserving();
      } else {
        this.scheduleBatch(generation);
      }
    } catch (error) {
      this.failSafely(error);
    }
  }

  private correctSample(sample: TextColorSample): TargetState | null {
    if (
      !textTarget(sample) ||
      (this.targets.size >= TARGET_LIMIT && !this.targets.has(sample.element))
    ) {
      return null;
    }
    const settings = this.settings;
    if (!settings) return null;
    const overlay = parseColor(dimmingColor(settings.dimming));
    const finalAdjustment = ensureContrast(
      sample.foreground,
      sample.background,
      // Keep a small safety margin for CSS serialization and browser rounding.
      (sample.largeText ? 3 : 4.5) + 0.1,
      overlay?.a ? overlay : undefined,
    );
    if (!finalAdjustment.changed || !finalAdjustment.reachable) return null;
    return {
      token: `${this.tokenPrefix}_${this.nextTargetId++}`,
      originalAttribute: null,
      appliedAttribute: '',
      originalColor: '',
      originalColorPriority: '',
      appliedColor: '',
      appliedStyleAttribute: '',
      color: serializeColor(finalAdjustment.color),
    };
  }

  private installTarget(element: HTMLElement, next: TargetState): void {
    const existing = this.targets.get(element);
    const state = existing ?? {
      ...next,
      originalAttribute: element.getAttribute(TARGET_ATTRIBUTE),
      appliedAttribute: '',
      originalColor: element.style.getPropertyValue('color'),
      originalColorPriority: element.style.getPropertyPriority('color'),
      appliedStyleAttribute: '',
    };
    state.color = next.color;
    const current = element.getAttribute(TARGET_ATTRIBUTE);
    const tokens = (current ?? '').split(/\s+/).filter(Boolean);
    if (!tokens.includes(state.token)) tokens.push(state.token);
    state.appliedAttribute = tokens.join(' ');
    element.setAttribute(TARGET_ATTRIBUTE, state.appliedAttribute);
    // Dark Reader rewrites injected stylesheets. A bounded inline color override
    // guarantees the measured correction wins; its exact prior value is restored.
    element.style.setProperty('color', state.color, 'important');
    state.appliedColor = element.style.getPropertyValue('color');
    this.targets.set(element, state);
    state.appliedStyleAttribute = element.getAttribute('style') ?? '';
  }

  private removeTarget(element: HTMLElement): void {
    const state = this.targets.get(element);
    if (!state) return;
    if (
      element.style.getPropertyValue('color') === state.appliedColor &&
      element.style.getPropertyPriority('color') === 'important'
    ) {
      if (state.originalColor) {
        element.style.setProperty('color', state.originalColor, state.originalColorPriority);
      } else {
        element.style.removeProperty('color');
      }
    }
    const current = element.getAttribute(TARGET_ATTRIBUTE);
    if (current === state.appliedAttribute) {
      if (state.originalAttribute === null) element.removeAttribute(TARGET_ATTRIBUTE);
      else element.setAttribute(TARGET_ATTRIBUTE, state.originalAttribute);
    } else {
      const remaining = (current ?? '').split(/\s+/).filter((part) => part && part !== state.token);
      if (remaining.length === 0) element.removeAttribute(TARGET_ATTRIBUTE);
      else element.setAttribute(TARGET_ATTRIBUTE, remaining.join(' '));
    }
    this.targets.delete(element);
  }

  private forgetSubtree(root: Node): void {
    for (const element of this.targets.keys()) {
      if (belongsToSubtree(root, element)) this.removeTarget(element);
    }
    for (const element of this.samples.keys()) {
      if (belongsToSubtree(root, element)) this.samples.delete(element);
    }
  }

  private scheduleBatch(generation: number): void {
    if (this.scheduledTask || generation !== this.generation || !this.document?.defaultView) return;
    const view = this.document.defaultView;
    if (view.requestIdleCallback) {
      const handle = view.requestIdleCallback(
        (deadline) => {
          this.scheduledTask = null;
          const budget = Math.max(
            24,
            Math.min(WORK_PER_IDLE_TURN, Math.floor(deadline.timeRemaining() * 8)),
          );
          this.processBatch(generation, budget);
        },
        { timeout: 120 },
      );
      this.scheduledTask = { kind: 'idle', handle, view };
    } else {
      const handle = view.setTimeout(() => {
        this.scheduledTask = null;
        this.processBatch(generation, WORK_PER_IDLE_TURN);
      }, 0);
      this.scheduledTask = { kind: 'timeout', handle, view };
    }
  }

  private cancelScheduledWork(): void {
    const task = this.scheduledTask;
    if (!task) return;
    if (task.kind === 'idle') task.view.cancelIdleCallback?.(task.handle);
    else task.view.clearTimeout(task.handle);
    this.scheduledTask = null;
  }

  private beginObserving(): void {
    if (this.observerStarted || !this.document?.documentElement) return;
    this.observerStarted = true;
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
          if (mutation.target instanceof HTMLElement) {
            const targetState = this.targets.get(mutation.target);
            if (
              mutation.attributeName === 'style' &&
              targetState &&
              (mutation.target.getAttribute('style') ?? '') === targetState.appliedStyleAttribute
            ) {
              continue;
            }
            // Clear old decisions in the changed subtree before recomputing from fresh styles.
            this.forgetSubtree(mutation.target);
            this.pendingRoots.add(mutation.target);
          }
        } else if (mutation.type === 'characterData') {
          const parent = mutation.target.parentElement;
          if (parent) this.pendingRoots.add(parent);
        } else {
          for (const node of mutation.removedNodes) this.forgetSubtree(node);
          for (const node of mutation.addedNodes) {
            if (node instanceof HTMLElement) this.pendingRoots.add(node);
            else if (node.parentElement) this.pendingRoots.add(node.parentElement);
          }
        }
      }
      if (this.pendingRoots.size === 0 || !this.document?.defaultView) return;
      if (this.mutationTimer !== null) this.document.defaultView.clearTimeout(this.mutationTimer);
      const generation = this.generation;
      this.mutationTimer = this.document.defaultView.setTimeout(() => {
        this.mutationTimer = null;
        this.scheduleBatch(generation);
      }, 100);
    });
    this.observer.observe(this.document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRIBUTE_FILTER,
    });
  }

  private failSafely(error: unknown): void {
    console.warn(
      '[NightTime] Adaptive text analysis stopped; the base dark theme remains active.',
      error,
    );
    this.disable();
  }
}
