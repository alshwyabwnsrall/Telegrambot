/**
 * Safely converts any value (including GramJS BigInteger objects { value: ... }, numbers, BigInts, etc.)
 * into a safe primitive string for React children rendering.
 */
export function safeString(val: any, fallback: string = ''): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'bigint' || typeof val === 'boolean') {
    return String(val);
  }
  if (typeof val === 'object') {
    if (val.value !== undefined) {
      return String(val.value);
    }
    if (typeof val.toString === 'function' && val.toString !== Object.prototype.toString) {
      return val.toString();
    }
    try {
      return JSON.stringify(val);
    } catch {
      return fallback;
    }
  }
  return String(val);
}
