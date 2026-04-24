import { z } from 'zod';
import { mapLegacySlug } from './slug-mapping';

/**
 * Field aliases applied by normalizeQuestion before Zod runs. Keys are the
 * input names (case-insensitive after lowering); values are the canonical
 * names our schemas expect.
 */
const FIELD_ALIASES: Record<string, string> = {
  // Discipline
  disciplinaid: 'disciplina_id',
  disciplina: 'disciplina_id',
  disciplineid: 'disciplina_id',
  discipline_id: 'disciplina_id',
  discipline: 'disciplina_id',

  // Banca
  bancaestilo: 'banca_estilo',
  banca_estilo: 'banca_estilo',
  banca: 'banca_estilo',

  // Explicação
  explicacaogeral: 'explicacao_geral',
  explicacao_resposta: 'explicacao_geral',
  explicacao_geral: 'explicacao_geral',

  // Gabarito / answer
  resposta: 'gabarito',
  answer: 'gabarito',
  gabarito: 'gabarito',

  // Pegadinhas
  pegadinha: 'pegadinhas',
  traps: 'pegadinhas',
  pegadinhas: 'pegadinhas',

  // Alternativa inner keys
  letter: 'letra',
  letra: 'letra',
  text: 'texto',
  texto: 'texto',
  correct: 'correta',
  certa: 'correta',
  correta: 'correta',
  explanation: 'explicacao',
  explicacao: 'explicacao',

  // Discursiva keys
  enunciadocompleto: 'enunciado_completo',
  enunciado_completo: 'enunciado_completo',
  textobase: 'texto_base',
  texto_base: 'texto_base',
  espelho: 'espelho_resposta',
  espelho_resposta: 'espelho_resposta',
  maxlinhas: 'max_linhas',
  max_linhas: 'max_linhas',
  pontuacaomaxima: 'pontuacao_maxima',
  pontuacao_maxima: 'pontuacao_maxima',
  tipodiscursiva: 'tipo_discursiva',
  tipo_discursiva: 'tipo_discursiva',
};

function normalizeKey(key: string): string {
  const lowered = key.toLowerCase();
  return FIELD_ALIASES[lowered] ?? key;
}

/**
 * Recursively normalizes an object:
 *  - renames top-level and nested keys per FIELD_ALIASES (case-insensitive)
 *  - applies slug-mapping to `disciplina_id` values when present
 */
export function normalizeQuestion(raw: unknown): unknown {
  if (raw === null || raw === undefined) return raw;
  if (Array.isArray(raw)) return raw.map(normalizeQuestion);
  if (typeof raw !== 'object') return raw;

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const normalizedKey = normalizeKey(key);
    if (normalizedKey === 'disciplina_id' && typeof value === 'string') {
      out[normalizedKey] = mapLegacySlug(value);
    } else {
      out[normalizedKey] = normalizeQuestion(value);
    }
  }
  return out;
}

/**
 * Heuristic for deciding whether a raw item is objective or discursive.
 * Explicit `tipo` wins; otherwise we look for discursive-only fields, then
 * fall back to the alternativas[] presence.
 */
export function detectQuestionType(raw: unknown): 'objetiva' | 'discursiva' {
  if (raw === null || typeof raw !== 'object') return 'objetiva';
  const r = raw as Record<string, unknown>;
  if (r.tipo === 'discursiva') return 'discursiva';
  if (r.tipo === 'objetiva') return 'objetiva';
  if (
    r.rubrica ||
    r.espelho_resposta ||
    r.max_linhas ||
    r.enunciado_completo ||
    r.quesitos
  ) {
    return 'discursiva';
  }
  if (Array.isArray(r.alternativas) && r.alternativas.length > 0) return 'objetiva';
  return 'objetiva';
}

// -----------------------------------------------------------------------------
// OBJECTIVES
// -----------------------------------------------------------------------------
const AlternativaSchema = z.object({
  letra: z.string().regex(/^[A-E]$/, 'letra deve ser A..E'),
  texto: z.string().min(1, 'texto obrigatório'),
  correta: z.boolean(),
  explicacao: z.string().min(1, 'explicação obrigatória'),
});

export const ObjectiveQuestionSchema = z
  .object({
    disciplina_id: z.string().min(1, 'disciplina_id obrigatório'),
    tema: z.string().min(1, 'tema obrigatório'),
    dificuldade: z.coerce.number().int().min(1).max(5).default(3),
    banca_estilo: z.string().default('FGV'),
    enunciado: z.string().min(10, 'enunciado muito curto'),
    alternativas: z
      .array(AlternativaSchema)
      .length(5, 'deve ter exatamente 5 alternativas')
      .refine(
        (alts) => alts.filter((a) => a.correta).length === 1,
        'exatamente 1 alternativa deve ser correta',
      ),
    gabarito: z.string().regex(/^[A-E]$/, 'gabarito deve ser A..E'),
    explicacao_geral: z.string().min(10, 'explicação geral muito curta'),
    pegadinhas: z.array(z.string()).optional().default([]),
  })
  .refine(
    (q) => q.gabarito === q.alternativas.find((a) => a.correta)?.letra,
    'gabarito deve bater com a letra da alternativa marcada como correta',
  );

export type ObjectiveQuestionInput = z.input<typeof ObjectiveQuestionSchema>;
export type ObjectiveQuestion = z.output<typeof ObjectiveQuestionSchema>;

// -----------------------------------------------------------------------------
// DISCURSIVES
// -----------------------------------------------------------------------------
const QuesitoSchema = z.object({
  numero: z.coerce.number().int(),
  pergunta: z.string().min(1),
  pontos_max: z.coerce.number(),
});

const RubricaItemSchema = z.object({
  criterio: z.string().min(1),
  pontos: z.coerce.number(),
  detalhamento: z.string().optional(),
});

export const DiscursiveQuestionSchema = z.object({
  tipo: z.literal('discursiva').optional(),
  disciplina_id: z.string().min(1),
  tema: z.string().min(1),
  dificuldade: z.coerce.number().int().min(1).max(5).default(4),
  banca_estilo: z.string().default('FGV'),
  tipo_discursiva: z.enum(['A', 'B', 'C']).optional(),
  enunciado_completo: z.string().min(20, 'enunciado_completo muito curto'),
  texto_base: z.string().optional().nullable(),
  comando: z.string().optional(),
  quesitos: z.array(QuesitoSchema).optional(),
  rubrica: z.array(RubricaItemSchema).optional(),
  espelho_resposta: z.string().min(30).optional(),
  conceitos_chave: z.array(z.string()).optional(),
  pegadinhas_esperadas: z.array(z.string()).optional(),
  estrategia_redacao: z.string().optional(),
  observacoes_corretor: z.string().optional(),
  apostas_relacionadas: z.array(z.string()).optional(),
  max_linhas: z.coerce.number().int().default(15),
  pontuacao_maxima: z.coerce.number().default(10),
});

export type DiscursiveQuestionInput = z.input<typeof DiscursiveQuestionSchema>;
export type DiscursiveQuestion = z.output<typeof DiscursiveQuestionSchema>;

// -----------------------------------------------------------------------------
// BATCH BODY (for the import API)
// -----------------------------------------------------------------------------
export const ImportBodySchema = z.object({
  items: z.array(z.unknown()).min(1).max(1000),
  study_profile_id: z.string().uuid(),
});

export type ImportBody = z.infer<typeof ImportBodySchema>;

/**
 * Normalizes an enunciado for hashing: lowercase, collapse whitespace, trim.
 * Stable output across both client and server (no crypto — hashing happens
 * server-side in src/lib/hash.ts).
 */
export function normalizeEnunciadoForHash(enunciado: string): string {
  return enunciado.toLowerCase().replace(/\s+/g, ' ').trim();
}
