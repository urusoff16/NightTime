const OVERLAY_ID = 'night-mode-dimming-overlay';

export function dimmingColor(dimming: number): string {
  return `rgba(0, 0, 0, ${Math.min(80, Math.max(0, dimming)) / 100})`;
}

export class DimmingOverlay {
  apply(dimming: number): void {
    if (typeof document === 'undefined') return;
    let overlay = document.getElementById(OVERLAY_ID) as HTMLDivElement | null;
    if (typeof window !== 'undefined' && window.self !== window.top) {
      overlay?.remove();
      return;
    }
    if (dimming <= 0) {
      overlay?.remove();
      return;
    }
    if (overlay === null) {
      overlay = document.createElement('div');
      overlay.id = OVERLAY_ID;
      overlay.dataset.nightModeLayer = 'dimming';
      overlay.setAttribute('aria-hidden', 'true');
      Object.assign(overlay.style, {
        position: 'fixed',
        inset: '0',
        pointerEvents: 'none',
        zIndex: '2147483646',
      });
      document.documentElement.append(overlay);
    }
    overlay.style.background = dimmingColor(dimming);
  }

  disable(): void {
    if (typeof document === 'undefined') return;
    document.getElementById(OVERLAY_ID)?.remove();
  }
}
