import type { EngineMode, ThemeSettings } from '../shared/settings-model';
import { DimmingOverlay } from './dimming-overlay';
import { ReadabilityLayer } from './readability-layer';
import { SmartEngine } from './smart-engine';

export interface EngineApplyResult {
  engine: EngineMode;
  fallbackUsed: boolean;
}

export class EngineManager {
  private readonly dimmingOverlay = new DimmingOverlay();
  private readonly readabilityLayer = new ReadabilityLayer();
  private readonly smartEngine = new SmartEngine();
  private activeEngine: EngineMode | null = null;

  apply(_requestedEngine: EngineMode, settings: ThemeSettings): EngineApplyResult {
    try {
      this.smartEngine.apply(settings);
      this.readabilityLayer.apply();
      this.dimmingOverlay.apply(settings.dimming);
      this.activeEngine = 'smart';
      return { engine: 'smart', fallbackUsed: false };
    } catch (error) {
      this.smartEngine.disable();
      this.readabilityLayer.disable();
      this.dimmingOverlay.disable();
      this.activeEngine = null;
      throw error;
    }
  }

  disable(): void {
    if (this.activeEngine !== null) this.smartEngine.disable();
    this.readabilityLayer.disable();
    this.dimmingOverlay.disable();
    this.activeEngine = null;
  }
}
