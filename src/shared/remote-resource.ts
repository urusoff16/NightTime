export const REMOTE_RESOURCE_REQUEST = 'NIGHTTIME_FETCH_REMOTE_RESOURCE' as const;

export interface RemoteResourceRequest {
  type: typeof REMOTE_RESOURCE_REQUEST;
  url: string;
}

export interface RemoteResourceData {
  bodyBase64: string;
  headers: Array<[string, string]>;
  status: number;
  statusText: string;
}

export type RemoteResourceResult =
  { ok: true; data: RemoteResourceData } | { ok: false; error: string };

export function isRemoteResourceRequest(value: unknown): value is RemoteResourceRequest {
  if (value === null || typeof value !== 'object') return false;
  const candidate = value as { type?: unknown; url?: unknown };
  return candidate.type === REMOTE_RESOURCE_REQUEST && typeof candidate.url === 'string';
}
