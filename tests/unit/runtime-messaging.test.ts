import { afterEach, describe, expect, it, vi } from 'vitest';

import { sendRuntimeMessage } from '../../src/shared/runtime-messaging';

describe('runtime messaging', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the callback response when a library wrapper drops the returned Promise', async () => {
    const nativeSendMessage = vi.fn(
      (_message: unknown, callback: (response: { ok: true }) => void) => {
        callback({ ok: true });
      },
    );
    const patchedSendMessage = (...args: Parameters<typeof nativeSendMessage>): void => {
      nativeSendMessage(...args);
    };
    vi.stubGlobal('chrome', {
      runtime: { lastError: undefined, sendMessage: patchedSendMessage },
    });

    await expect(sendRuntimeMessage<{ ok: true }>({ type: 'TEST' })).resolves.toEqual({
      ok: true,
    });
  });

  it('reports a missing background response without reading properties of undefined', async () => {
    vi.stubGlobal('chrome', {
      runtime: {
        lastError: undefined,
        sendMessage: (_message: unknown, callback: (response?: unknown) => void) => callback(),
      },
    });

    await expect(sendRuntimeMessage({ type: 'TEST' })).rejects.toThrow(
      'Extension background did not return a response.',
    );
  });
});
