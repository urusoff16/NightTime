const OVERLAY_ID = 'night-mode-night-shift-overlay';

export class NightShiftOverlay {
  apply(enabled: boolean, intensity: number): void {
    let overlay = document.getElementById(OVERLAY_ID) as HTMLDivElement | null;
    if (typeof window !== 'undefined' && window.self !== window.top) {
      overlay?.remove();
      return;
    }
    if (!enabled || intensity <= 0) {
      overlay?.remove();
      return;
    }
    if (overlay === null) {
      overlay = document.createElement('div');
      overlay.id = OVERLAY_ID;
      overlay.dataset.nightModeLayer = 'night-shift';
      overlay.setAttribute('aria-hidden', 'true');
      Object.assign(overlay.style, {
        position: 'fixed',
        inset: '0',
        pointerEvents: 'none',
        zIndex: '2147483645',
        mixBlendMode: 'multiply',
      });
      document.documentElement.append(overlay);
    }
    overlay.style.background = `rgba(255, 154, 66, ${Math.min(100, intensity) / 250})`;
  }
}
