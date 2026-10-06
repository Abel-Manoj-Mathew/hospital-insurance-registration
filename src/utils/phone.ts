/** Accepts digits with an optional leading '+' and optional spaces/hyphens; requires 7-15 digits overall. */
export function isValidPhoneNumber(value: string): boolean {
  const trimmed = value.trim()
  if (!/^\+?[0-9\s-]+$/.test(trimmed)) return false
  const digitCount = trimmed.replace(/[^0-9]/g, '').length
  return digitCount >= 7 && digitCount <= 15
}
