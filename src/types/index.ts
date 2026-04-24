import type { Database } from './database';

// Row-level table types (generated shapes).
export type Question = Database['public']['Tables']['questions']['Row'];
export type QuestionInsert = Database['public']['Tables']['questions']['Insert'];
export type Discursive = Database['public']['Tables']['discursives']['Row'];
export type DiscursiveInsert = Database['public']['Tables']['discursives']['Insert'];
export type Review = Database['public']['Tables']['reviews']['Row'];
export type Attempt = Database['public']['Tables']['attempts']['Row'];
export type StudySession = Database['public']['Tables']['study_sessions']['Row'];
export type SimuladoTemplate = Database['public']['Tables']['simulado_templates']['Row'];
export type Simulado = Database['public']['Tables']['simulados']['Row'];
export type Discipline = Database['public']['Tables']['disciplines']['Row'];
export type Topic = Database['public']['Tables']['topics']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type StudyProfile = Database['public']['Tables']['study_profiles']['Row'];

// The generated types type `alternativas` as Json. This is its real shape.
export type Alternativa = {
  letra: 'A' | 'B' | 'C' | 'D' | 'E';
  texto: string;
  correta: boolean;
  explicacao: string;
};

export function parseAlternativas(raw: unknown): Alternativa[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
    .map((x) => ({
      letra: String(x.letra ?? '') as Alternativa['letra'],
      texto: String(x.texto ?? ''),
      correta: Boolean(x.correta),
      explicacao: String(x.explicacao ?? ''),
    }));
}

/** Configuração de uma study_session (armazenada em .config jsonb). */
export type StudySessionConfig = {
  discipline_ids?: string[];
  topic_ids?: string[];
  dificuldade_min?: number;
  dificuldade_max?: number;
  fontes?: string[]; // origem filter
  timer_per_question_s?: number | null;
  show_gabarito?: boolean;
  shuffle_alternativas?: boolean;
  ask_fsrs_rating?: boolean;
  modo?: StudyMode;
};

export type StudyMode =
  | 'aleatorio'
  | 'ordem'
  | 'recentes'
  | 'quality'
  | 'fsrs_due'
  | 'fsrs_due_learning'
  | 'repetir_erradas';
