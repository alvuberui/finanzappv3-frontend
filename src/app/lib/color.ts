export function normalizeHexColor(value?: string | null): string | null {
  if (!value) return null;
  const color = value.trim();
  if (/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)) return color;
  return /^(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color) ? `#${color}` : null;
}
