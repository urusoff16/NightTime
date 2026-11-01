import type { EngineMode, ThemeSettings } from '../shared/settings-model';
import { DimmingOverlay } from './dimming-overlay';
import { ReadabilityLayer } from './readability-layer';
import { SmartEngine } from './smart-engine';
import { AdaptiveTextLayer } from './smart-dark/apply/adaptive-text-layer';

export interface EngineApplyResult {
  engine: EngineMode;
  fallbackUsed: boolean;
}

export class EngineManager {
  private readonly dimmingOverlay = new DimmingOverlay();
  private readonly readabilityLayer = new ReadabilityLayer();
  private readonly smartEngine = new SmartEngine();
  private readonly adaptiveTextLayer = new AdaptiveTextLayer();
  private activeEngine: EngineMode | null = null;

  apply(_requestedEngine: EngineMode, settings: ThemeSettings): EngineApplyResult {
    try {
      // Rebuild from fresh base-engine styles so profile changes never compound.
      this.adaptiveTextLayer.disable();
      this.smartEngine.apply(settings);
      this.readabilityLayer.apply(settings);
      this.dimmingOverlay.apply(settings.dimming);
      this.adaptiveTextLayer.apply(settings);
      this.activeEngine = 'smart';
      return { engine: 'smart', fallbackUsed: false };
    } catch (error) {
      this.smartEngine.disable();
      this.readabilityLayer.disable();
      this.dimmingOverlay.disable();
      this.adaptiveTextLayer.disable();
      this.activeEngine = null;
      throw error;
    }
  }

  disable(): void {
    this.adaptiveTextLayer.disable();
    if (this.activeEngine !== null) this.smartEngine.disable();
    this.readabilityLayer.disable();
    this.dimmingOverlay.disable();
    this.activeEngine = null;
  }
}
