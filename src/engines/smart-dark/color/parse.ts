import type { ColorValue } from '../types';

function channel(value: string): number | null {
  const trimmed = value.trim();
  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return trimmed.endsWith('%')
    ? Math.min(1, Math.max(0, parsed / 100))
    : Math.min(1, Math.max(0, parsed / 255));
}

function alpha(value: string): number | null {
  const trimmed = value.trim();
  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(1, Math.max(0, trimmed.endsWith('%') ? parsed / 100 : parsed));
}

function parseHex(value: string): ColorValue | null {
  const hex = value.slice(1);
  if (![3, 4, 6, 8].includes(hex.length) || !/^[\da-f]+$/i.test(hex)) return null;
  const expanded = hex.length <= 4 ? [...hex].map((part) => `${part}${part}`).join('') : hex;
  const components = expanded.match(/.{2}/g)?.map((part) => Number.parseInt(part, 16) / 255);
  if (!components || components.length < 3) return null;
  return {
    r: components[0] ?? 0,
    g: components[1] ?? 0,
    b: components[2] ?? 0,
    a: components[3] ?? 1,
  };
}

function parseRgb(value: string): ColorValue | null {
  const match = /^rgba?\((.*)\)$/i.exec(value.trim());
  if (!match?.[1]) return null;
  const [channels = '', alphaValue] = match[1].split('/');
  const parts = channels.includes(',')
    ? channels.split(',').map((part) => part.trim())
    : channels.trim().split(/\s+/);
  if (parts.length !== 3 && !(parts.length === 4 && alphaValue === undefined)) return null;
  const rgb = parts.slice(0, 3).map(channel);
  const a =
    alphaValue === undefined ? (parts[3] === undefined ? 1 : alpha(parts[3])) : alpha(alphaValue);
  if (rgb.some((part) => part === null) || a === null) return null;
  return { r: rgb[0] ?? 0, g: rgb[1] ?? 0, b: rgb[2] ?? 0, a };
}

/** Parses canonical computed CSS colors and hex values without guessing unknown syntax. */
export function parseColor(value: string): ColorValue | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  if (normalized.startsWith('#')) return parseHex(normalized);
  if (normalized.startsWith('rgb(') || normalized.startsWith('rgba(')) return parseRgb(normalized);
  return null;
}

export function serializeColor(color: ColorValue): string {
  const r = Math.round(Math.min(1, Math.max(0, color.r)) * 255);
  const g = Math.round(Math.min(1, Math.max(0, color.g)) * 255);
  const b = Math.round(Math.min(1, Math.max(0, color.b)) * 255);
  const a = Number(Math.min(1, Math.max(0, color.a)).toFixed(3));
  return `rgb(${r} ${g} ${b} / ${a})`;
}
