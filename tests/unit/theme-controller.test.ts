import { beforeEach, describe, expect, it, vi } from 'vitest';

const { enableMock, disableMock, setFetchMethodMock } = vi.hoisted(() => ({
  enableMock: vi.fn(),
  disableMock: vi.fn(),
  setFetchMethodMock: vi.fn(),
}));

vi.mock('darkreader', () => ({
  enable: enableMock,
  disable: disableMock,
  setFetchMethod: setFetchMethodMock,
}));

import { ThemeController } from '../../src/content/theme-controller';
import { DEFAULT_THEME_SETTINGS } from '../../src/shared/settings-model';

describe('ThemeController', () => {
  beforeEach(() => {
    enableMock.mockReset();
    disableMock.mockReset();
    setFetchMethodMock.mockReset();
  });

  it('does not create a second engine for identical settings', () => {
    const controller = new ThemeController();

    controller.apply({ brightness: 90, contrast: 110 });
    controller.apply({ brightness: 90, contrast: 110 });

    expect(enableMock).toHaveBeenCalledTimes(1);
    expect(enableMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        disableStyleSheetsProxy: true,
        disableCustomElementRegistryProxy: true,
      }),
    );
    expect(setFetchMethodMock).toHaveBeenCalledTimes(1);
    expect(setFetchMethodMock).toHaveBeenCalledWith(expect.any(Function));
    expect(controller.getState()).toEqual({
      enabled: true,
      engine: 'smart',
      brightness: 90,
      contrast: 110,
    });
  });

  it('updates settings and cleans up exactly once', () => {
    const controller = new ThemeController();

    controller.apply({ brightness: 90, contrast: 110 });
    controller.apply({ brightness: 95, contrast: 110 });
    controller.disable();
    controller.disable();

    expect(enableMock).toHaveBeenCalledTimes(2);
    expect(disableMock).toHaveBeenCalledTimes(1);
    expect(controller.getState()).toEqual({
      enabled: false,
      engine: null,
      brightness: null,
      contrast: null,
    });
  });

  it('reapplies an active profile when any theme parameter changes', () => {
    const controller = new ThemeController();

    controller.apply(DEFAULT_THEME_SETTINGS);
    controller.apply({ ...DEFAULT_THEME_SETTINGS, warmth: 38, dimming: 10 });

    expect(enableMock).toHaveBeenCalledTimes(2);
    expect(enableMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ sepia: 38 }),
      expect.any(Object),
    );
    expect(disableMock).not.toHaveBeenCalled();
    expect(controller.getState().enabled).toBe(true);
  });
});
