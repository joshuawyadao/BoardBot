/** Stable encoding for validated JSON-shaped game data and snapshots. Preserve fingerprint bytes. */
export function canonicalJSON(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(entry => canonicalJSON(entry) ?? 'null').join(',')}]`;
  return `{${Object.entries(value).filter(([, entry]) => entry !== undefined)
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJSON(entry)}`).join(',')}}`;
}
