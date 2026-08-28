/**
 * PostgreSQL columns are snake_case by convention; JavaScript is camelCase.
 * Converting once, here at the API boundary, means the SQL stays idiomatic and
 * the frontend never has to deal with mixed naming.
 */
function toCamelKey(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

export function camelize<T = unknown>(value: unknown): T {
  if (Array.isArray(value)) {
    return value.map((v) => camelize(v)) as unknown as T;
  }

  if (value instanceof Date) {
    return value.toISOString() as unknown as T;
  }

  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[toCamelKey(key)] = camelize(val);
    }
    return out as T;
  }

  return value as T;
}
