import { createHash } from 'node:crypto';
import { normalizeEnunciadoForHash } from './validators/questions';

/**
 * 32-char md5 of the normalized enunciado. Used server-side for dedupe on
 * import. Client never computes this — the server resolves duplicates.
 *
 * SERVER-ONLY: imports node:crypto.
 */
export function enunciadoHash(enunciado: string): string {
  const normalized = normalizeEnunciadoForHash(enunciado);
  return createHash('md5').update(normalized).digest('hex');
}
