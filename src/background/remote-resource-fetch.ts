import type { RemoteResourceData } from '../shared/remote-resource';

export const MAX_REMOTE_RESOURCE_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 4;

const ALLOWED_MIME_TYPES = [
  'application/font-woff',
  'application/font-woff2',
  'application/octet-stream',
  'application/vnd.ms-fontobject',
  'font/',
  'image/',
  'text/css',
  'text/plain',
] as const;

function isBlockedIpv4(hostname: string): boolean {
  const parts = hostname.split('.');
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return false;
  const octets = parts.map(Number);
  if (octets.some((octet) => octet < 0 || octet > 255)) return true;
  const [first = 0, second = 0] = octets;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    first >= 224
  );
}

export function isAllowedRemoteResourceUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    if (url.username || url.password) return false;
    const hostname = url.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.lan') ||
      hostname.includes(':') ||
      isBlockedIpv4(hostname)
    ) {
      return false;
    }
    return hostname.length > 0;
  } catch {
    return false;
  }
}

function isAllowedContentType(value: string | null): boolean {
  if (!value) return false;
  const mimeType = value.split(';', 1)[0]?.trim().toLowerCase() ?? '';
  return ALLOWED_MIME_TYPES.some((allowed) =>
    allowed.endsWith('/') ? mimeType.startsWith(allowed) : mimeType === allowed,
  );
}

function bytesToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

export async function fetchRemoteResource(
  initialUrl: string,
  fetchMethod: typeof fetch = globalThis.fetch,
): Promise<RemoteResourceData> {
  let currentUrl = initialUrl;
  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    if (!isAllowedRemoteResourceUrl(currentUrl)) {
      throw new Error('Remote resource URL is not allowed.');
    }
    const response = await fetchMethod(currentUrl, {
      cache: 'force-cache',
      credentials: 'omit',
      redirect: 'manual',
      referrerPolicy: 'no-referrer',
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location || redirectCount === MAX_REDIRECTS) {
        throw new Error('Remote resource redirect is invalid.');
      }
      currentUrl = new URL(location, currentUrl).href;
      continue;
    }

    if (!isAllowedRemoteResourceUrl(response.url || currentUrl)) {
      throw new Error('Remote resource redirected to a blocked URL.');
    }
    const contentType = response.headers.get('content-type');
    if (!isAllowedContentType(contentType)) {
      throw new Error(`Remote resource type is not allowed: ${contentType ?? 'missing'}.`);
    }
    const declaredLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_REMOTE_RESOURCE_BYTES) {
      throw new Error('Remote resource is too large.');
    }
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_REMOTE_RESOURCE_BYTES) {
      throw new Error('Remote resource is too large.');
    }
    return {
      bodyBase64: bytesToBase64(buffer),
      headers: Array.from(response.headers.entries()),
      status: response.status,
      statusText: response.statusText,
    };
  }
  throw new Error('Remote resource redirect limit exceeded.');
}
