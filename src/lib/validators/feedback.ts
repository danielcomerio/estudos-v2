import { z } from 'zod';

export const FEEDBACK_MOTIVOS = [
  'gabarito_errado',
  'ambigua',
  'erro_factual',
  'explicacao_ruim',
  'outro',
] as const;

export const FEEDBACK_MOTIVO_LABELS: Record<(typeof FEEDBACK_MOTIVOS)[number], string> = {
  gabarito_errado: 'Gabarito errado',
  ambigua: 'Ambígua',
  erro_factual: 'Erro factual',
  explicacao_ruim: 'Explicação ruim',
  outro: 'Outro',
};

export const FeedbackBodySchema = z.object({
  question_id: z.string().uuid(),
  target: z.enum(['question', 'explanation']),
  vote: z.union([z.literal(1), z.literal(-1)]),
  motivo: z.enum(FEEDBACK_MOTIVOS).optional(),
  comentario: z.string().max(500).optional(),
  also_delete: z.boolean().optional(),
});

export type FeedbackBody = z.infer<typeof FeedbackBodySchema>;
