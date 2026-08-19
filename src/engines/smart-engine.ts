import { disable, enable, setFetchMethod } from 'darkreader';

import type { ThemeSettings } from '../shared/settings-model';
import { REMOTE_RESOURCE_REQUEST, type RemoteResourceResult } from '../shared/remote-resource';
import type { ThemeEngine } from './engine';

function decodeBase64(value: string): ArrayBuffer {
  const binary = atob(value);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return buffer;
}

async function fetchThroughExtension(url: string): Promise<Response> {
  const result = (await chrome.runtime.sendMessage({
    type: REMOTE_RESOURCE_REQUEST,
    url,
  })) as RemoteResourceResult;
  if (!result.ok) throw new Error(result.error);
  return new Response(decodeBase64(result.data.bodyBase64), {
    status: result.data.status,
    statusText: result.data.statusText,
    headers: result.data.headers,
  });
}

export class SmartEngine implements ThemeEngine {
  apply(settings: ThemeSettings): void {
    setFetchMethod(fetchThroughExtension);

    const cspSafeFixes = {
      invert: [],
      css: '',
      ignoreInlineStyle: [],
      ignoreImageAnalysis: [],
      disableStyleSheetsProxy: true,
      disableCustomElementRegistryProxy: true,
      ignoreCSSUrl: [],
    } as NonNullable<Parameters<typeof enable>[1]> & {
      disableCustomElementRegistryProxy: boolean;
    };

    enable(
      {
        brightness: settings.brightness,
        contrast: settings.contrast,
        sepia: settings.warmth,
        grayscale: settings.grayscale,
        darkSchemeBackgroundColor: settings.backgroundColor,
        darkSchemeTextColor: settings.textColor,
      },
      cspSafeFixes,
    );
  }

  disable(): void {
    disable();
  }
}
