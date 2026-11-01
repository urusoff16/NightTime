import { describe, expect, it, vi } from 'vitest';

import {
  fetchRemoteResource,
  isAllowedRemoteResourceUrl,
  MAX_REMOTE_RESOURCE_BYTES,
} from '../../src/background/remote-resource-fetch';

describe('remote resource fetch', () => {
  it('allows public HTTP resources and blocks local networks', () => {
    expect(isAllowedRemoteResourceUrl('https://cdn.example.com/theme.css')).toBe(true);
    expect(isAllowedRemoteResourceUrl('http://127.0.0.1/theme.css')).toBe(false);
    expect(isAllowedRemoteResourceUrl('http://192.168.1.5/theme.css')).toBe(false);
    expect(isAllowedRemoteResourceUrl('http://router.local/theme.css')).toBe(false);
    expect(isAllowedRemoteResourceUrl('file:///tmp/theme.css')).toBe(false);
  });

  it('serializes an allowed stylesheet response', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('body { color: white; }', {
        headers: { 'content-type': 'text/css; charset=utf-8' },
        status: 200,
        statusText: 'OK',
      }),
    );

    const result = await fetchRemoteResource('https://cdn.example.com/theme.css', fetchMock);

    expect(result.status).toBe(200);
    expect(atob(result.bodyBase64)).toBe('body { color: white; }');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://cdn.example.com/theme.css',
      expect.objectContaining({ credentials: 'omit', redirect: 'manual' }),
    );
  });

  it('serializes an allowed image response required by dynamic themes', async () => {
    const image = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(image, {
        headers: { 'content-type': 'image/png' },
        status: 200,
        statusText: 'OK',
      }),
    );

    const result = await fetchRemoteResource('https://cdn.example.com/icon.png', fetchMock);
    const decodedImage = Uint8Array.from(atob(result.bodyBase64), (character) =>
      character.charCodeAt(0),
    );

    expect(result.status).toBe(200);
    expect(Array.from(decodedImage)).toEqual(Array.from(image));
  });

  it('rejects oversized and unsafe content', async () => {
    const oversized = new Uint8Array(MAX_REMOTE_RESOURCE_BYTES + 1);
    await expect(
      fetchRemoteResource(
        'https://cdn.example.com/theme.css',
        vi
          .fn<typeof fetch>()
          .mockResolvedValue(new Response(oversized, { headers: { 'content-type': 'text/css' } })),
      ),
    ).rejects.toThrow('too large');

    await expect(
      fetchRemoteResource(
        'https://cdn.example.com/script.js',
        vi
          .fn<typeof fetch>()
          .mockResolvedValue(
            new Response('alert(1)', { headers: { 'content-type': 'text/javascript' } }),
          ),
      ),
    ).rejects.toThrow('type is not allowed');
  });
});
