import { fsrs, createEmptyCard, type Card, Rating, State } from 'ts-fsrs';
import type { Database } from '@/types/database';

export { Rating, State };

type ReviewRow = Database['public']['Tables']['reviews']['Row'];

/**
 * The columns we insert/update on public.reviews after a rating. The DB has
 * no learning_steps column (added by ts-fsrs v5) so we let PG set what it
 * tracks and drop learning_steps here.
 */
export type ReviewUpsertFields = {
  user_id: string;
  question_id: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number;
  last_review: string;
  due: string;
};

const scheduler = fsrs();

/**
 * Build a ts-fsrs Card from a reviews-table row (or from scratch for a new
 * card). Dates come back as strings from Postgres; we convert to Date.
 */
export function rowToCard(row: ReviewRow | null, fallbackDue: Date = new Date()): Card {
  if (!row) return createEmptyCard(fallbackDue);
  return {
    due: row.due ? new Date(row.due) : fallbackDue,
    stability: row.stability ?? 0,
    difficulty: row.difficulty ?? 0,
    elapsed_days: row.elapsed_days ?? 0,
    scheduled_days: row.scheduled_days ?? 0,
    learning_steps: 0,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state as State,
    last_review: row.last_review ? new Date(row.last_review) : undefined,
  };
}

/**
 * Apply a user rating to the current card state and produce the fields we
 * should upsert in public.reviews.
 */
export function applyRating(
  userId: string,
  questionId: string,
  currentRow: ReviewRow | null,
  grade: Rating.Again | Rating.Hard | Rating.Good | Rating.Easy,
  now: Date = new Date(),
): ReviewUpsertFields {
  const card = rowToCard(currentRow, now);
  const { card: next } = scheduler.next(card, now, grade);

  return {
    user_id: userId,
    question_id: questionId,
    stability: next.stability,
    difficulty: next.difficulty,
    elapsed_days: next.elapsed_days,
    scheduled_days: next.scheduled_days,
    reps: next.reps,
    lapses: next.lapses,
    state: next.state as number,
    last_review: (next.last_review ?? now).toISOString(),
    due: next.due.toISOString(),
  };
}

export const RATING_LABELS: Record<number, string> = {
  [Rating.Again]: 'De novo',
  [Rating.Hard]: 'Difícil',
  [Rating.Good]: 'Bom',
  [Rating.Easy]: 'Fácil',
};

export const STATE_LABELS: Record<number, string> = {
  [State.New]: 'Nova',
  [State.Learning]: 'Aprendendo',
  [State.Review]: 'Revisão',
  [State.Relearning]: 'Re-aprendendo',
};
