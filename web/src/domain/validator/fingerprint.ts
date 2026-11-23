/**
 * Deterministic Conflict Fingerprinting
 * Generates stable IDs for conflicts to enable Operations Manager acknowledgments (ConflictAck).
 */

export function generateConflictFingerprint(
  code: string,
  date: string,
  entityKey: string,
): string {
  // Simple, deterministic 32-bit FNV-1a hash
  const raw = `${code}:${date}:${entityKey}`;
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  return `cnf_${code.toLowerCase().slice(0, 4)}_${hex}`;
}
