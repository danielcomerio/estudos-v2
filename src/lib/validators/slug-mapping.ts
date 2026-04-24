/**
 * Maps legacy discipline slugs (from JSON exports of the previous app or older
 * prompt templates that assumed 16 granular disciplines) to the 5 canonical
 * slugs seeded in `public.disciplines`.
 *
 * Canonical set (slug → nome):
 *   portugues                → Português
 *   legislacao_mp            → Legislação e Código de Ética do MPES
 *   estatistica              → Análise Estatística e Inferência
 *   banco_de_dados           → Banco de Dados Relacionais
 *   inteligencia_artificial  → Inteligência Artificial
 */

export const CANONICAL_SLUGS = [
  'portugues',
  'legislacao_mp',
  'estatistica',
  'banco_de_dados',
  'inteligencia_artificial',
] as const;

export type CanonicalSlug = (typeof CANONICAL_SLUGS)[number];

const CANONICAL_SET = new Set<string>(CANONICAL_SLUGS);

const LEGACY_TO_CANONICAL: Record<string, CanonicalSlug> = {
  // Português (unchanged)
  portugues: 'portugues',

  // Legislação + ética do MP (absorbs legislação granular, gestão TI, laudos)
  legisMP: 'legislacao_mp',
  legismp: 'legislacao_mp',
  legis_mp: 'legislacao_mp',
  leiEtica: 'legislacao_mp',
  leietica: 'legislacao_mp',
  lei_etica: 'legislacao_mp',
  gestaoProjTI: 'legislacao_mp',
  gestaoprojti: 'legislacao_mp',
  gestao_proj_ti: 'legislacao_mp',
  laudos: 'legislacao_mp',

  // Estatística (absorbs Raciocínio / RLM + Visualização)
  estatistica: 'estatistica',
  raciocinio: 'estatistica',
  rlm: 'estatistica',
  visualizacao: 'estatistica',

  // Banco de Dados (absorbs DW / BI)
  bdRelacional: 'banco_de_dados',
  bdrelacional: 'banco_de_dados',
  bd_relacional: 'banco_de_dados',
  banco_dados: 'banco_de_dados',
  dwBi: 'banco_de_dados',
  dwbi: 'banco_de_dados',
  dw_bi: 'banco_de_dados',

  // Inteligência Artificial (absorbs ML sup/n-sup, DL, IA Gen, Prob+AL, Geo)
  mlSup: 'inteligencia_artificial',
  mlsup: 'inteligencia_artificial',
  ml_sup: 'inteligencia_artificial',
  mlNsup: 'inteligencia_artificial',
  mlnsup: 'inteligencia_artificial',
  ml_nsup: 'inteligencia_artificial',
  deepLearning: 'inteligencia_artificial',
  deeplearning: 'inteligencia_artificial',
  deep_learning: 'inteligencia_artificial',
  iaGen: 'inteligencia_artificial',
  iagen: 'inteligencia_artificial',
  ia_gen: 'inteligencia_artificial',
  probAlgLin: 'inteligencia_artificial',
  probalglin: 'inteligencia_artificial',
  prob_alg_lin: 'inteligencia_artificial',
  geoespacial: 'inteligencia_artificial',
};

/**
 * Returns the canonical slug for a given input, or the input trimmed/lowered
 * if no mapping exists. Callers are expected to verify the resolved slug
 * exists in the disciplines table before using it.
 */
export function mapLegacySlug(input: string): string {
  if (!input) return input;
  const trimmed = input.trim();
  if (CANONICAL_SET.has(trimmed)) return trimmed;
  // Try exact match first (case-sensitive), then case-insensitive.
  if (LEGACY_TO_CANONICAL[trimmed]) return LEGACY_TO_CANONICAL[trimmed];
  const lowered = trimmed.toLowerCase();
  if (CANONICAL_SET.has(lowered)) return lowered;
  if (LEGACY_TO_CANONICAL[lowered]) return LEGACY_TO_CANONICAL[lowered];
  return trimmed; // unknown — caller decides
}

export function isCanonicalSlug(slug: string): slug is CanonicalSlug {
  return CANONICAL_SET.has(slug);
}
