function hostnameFromUrl(value: string): string {
  if (!value) return '';
  try {
    return new URL(value).hostname;
  } catch {
    return '';
  }
}

export function getPageHostname(): string {
  if (location.hostname) return location.hostname;
  const ancestorOrigin = location.ancestorOrigins?.[0];
  return hostnameFromUrl(ancestorOrigin ?? document.referrer);
}

export function isExtensionPageAvailable(): boolean {
  return getPageHostname().length > 0;
}

export function detectNativeDarkTheme(): boolean {
  return getComputedStyle(document.documentElement).colorScheme.split(/\s+/).includes('dark');
}
