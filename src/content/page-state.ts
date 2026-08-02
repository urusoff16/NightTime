export function isExtensionPageAvailable(): boolean {
  return location.protocol === 'http:' || location.protocol === 'https:';
}

export function detectNativeDarkTheme(): boolean {
  return getComputedStyle(document.documentElement).colorScheme.split(/\s+/).includes('dark');
}
