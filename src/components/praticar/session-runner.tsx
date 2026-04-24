'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useUserData } from '@/hooks/use-user-data';
import { useDisciplines } from '@/hooks/use-disciplines';
import { QuestionCard } from '@/components/cards/question-card';
import { QuestionFeedback } from '@/components/cards/question-feedback';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { applyRating, Rating, type ReviewUpsertFields } from '@/lib/fsrs';
import type { Question, Review, StudySessionConfig } from '@/types';

type Session = {
  id: string;
  modo: string;
  num_questoes_alvo: number;
  finalizada: boolean;
  study_profile_id: string | null;
  config: StudySessionConfig;
};

type AnswerRecord = {
  chosenLetter: string | null;
  correct: boolean;
  timeMs: number;
  ratedGrade?: number;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function fetchSessionQuestions(
  supabase: ReturnType<typeof getSupabaseClient>,
  userId: string,
  studyProfileId: string | null,
  config: StudySessionConfig,
  limit: number,
): Promise<Question[]> {
  const modo = config.modo ?? 'aleatorio';

  if (modo === 'fsrs_due' && studyProfileId) {
    const { data, error } = await supabase.rpc('get_due_questions', {
      p_study_profile_id: studyProfileId,
      p_limit: limit,
    });
    if (error) throw error;
    return (data ?? []) as Question[];
  }

  if (modo === 'repetir_erradas') {
    const { data: wrongAttempts, error: aErr } = await supabase
      .from('attempts')
      .select('question_id, created_at')
      .eq('user_id', userId)
      .eq('acertou', false)
      .order('created_at', { ascending: false })
      .limit(200);
    if (aErr) throw aErr;
    const uniqueIds = Array.from(new Set((wrongAttempts ?? []).map((a) => a.question_id))).slice(
      0,
      limit,
    );
    if (uniqueIds.length === 0) return [];
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .in('id', uniqueIds)
      .is('deleted_at', null);
    if (error) throw error;
    // Preserve wrong-first order by reordering by uniqueIds.
    const byId = new Map((data ?? []).map((q) => [q.id, q]));
    return uniqueIds.map((id) => byId.get(id)).filter((q): q is Question => Boolean(q));
  }

  // Standard modes
  let builder = supabase
    .from('questions')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('dificuldade', config.dificuldade_min ?? 1)
    .lte('dificuldade', config.dificuldade_max ?? 5);
  if (config.discipline_ids && config.discipline_ids.length > 0) {
    builder = builder.in('discipline_id', config.discipline_ids);
  }

  if (modo === 'recentes') builder = builder.order('created_at', { ascending: false });
  else if (modo === 'ordem') builder = builder.order('created_at', { ascending: true });
  else if (modo === 'quality') builder = builder.order('quality_score', { ascending: false });

  const fetchLimit = modo === 'aleatorio' ? Math.max(limit * 4, limit) : limit;
  const { data, error } = await builder.limit(fetchLimit);
  if (error) throw error;

  if (modo === 'aleatorio') return shuffle(data ?? []).slice(0, limit);
  return (data ?? []).slice(0, limit);
}

export function SessionRunner({ session }: { session: Session }) {
  const { data: userData } = useUserData();
  const { data: disciplineData } = useDisciplines();
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();

  const userId = userData?.user.id;

  const disciplineById = useMemo(() => {
    const m = new Map<string, { name: string; short_name: string | null; cor_hex: string | null }>();
    for (const d of disciplineData?.disciplines ?? []) {
      m.set(d.id, { name: d.name, short_name: d.short_name, cor_hex: d.cor_hex });
    }
    return m;
  }, [disciplineData]);

  const topicById = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of disciplineData?.topics ?? []) m.set(t.id, t.name);
    return m;
  }, [disciplineData]);

  // Load questions once per session.
  const questionsQuery = useQuery({
    queryKey: ['session-questions', session.id],
    enabled: Boolean(userId),
    staleTime: Infinity, // fixed per session — we don't want reshuffling mid-session
    queryFn: async () => {
      const list = await fetchSessionQuestions(
        supabase,
        userId!,
        session.study_profile_id,
        session.config,
        session.num_questoes_alvo,
      );
      return list;
    },
  });

  // Pre-load existing review rows for these questions so we can compute FSRS next-state.
  const reviewsQuery = useQuery({
    queryKey: ['session-reviews', session.id],
    enabled: Boolean(userId) && (questionsQuery.data?.length ?? 0) > 0,
    staleTime: Infinity,
    queryFn: async () => {
      const ids = (questionsQuery.data ?? []).map((q) => q.id);
      if (ids.length === 0) return new Map<string, Review>();
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('user_id', userId!)
        .in('question_id', ids);
      if (error) throw error;
      return new Map<string, Review>((data ?? []).map((r) => [r.question_id, r]));
    },
  });

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerRecord>>({});

  const questions = questionsQuery.data ?? [];
  const total = questions.length;
  const currentQuestion = questions[currentIdx];

  const saveAttemptMutation = useMutation({
    mutationFn: async (payload: {
      question: Question;
      chosenLetter: string | null;
      correct: boolean;
      timeMs: number;
    }) => {
      if (!userId) throw new Error('Sem usuário');
      const { error } = await supabase.from('attempts').insert({
        user_id: userId,
        question_id: payload.question.id,
        session_id: session.id,
        resposta_letra: payload.chosenLetter,
        acertou: payload.correct,
        tempo_gasto_ms: payload.timeMs,
      });
      if (error) throw error;
    },
  });

  const upsertReviewMutation = useMutation({
    mutationFn: async (fields: ReviewUpsertFields) => {
      const { error } = await supabase
        .from('reviews')
        .upsert(fields, { onConflict: 'user_id,question_id' });
      if (error) throw error;
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('study_sessions')
        .update({
          finalizada: true,
          finalizada_em: new Date().toISOString(),
          num_questoes_respondidas: Object.keys(answers).length,
        })
        .eq('id', session.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['study_sessions'] });
    },
  });

  async function handleSubmit(
    q: Question,
    payload: { chosenLetter: string | null; timeMs: number; correct: boolean },
  ) {
    await saveAttemptMutation.mutateAsync({
      question: q,
      chosenLetter: payload.chosenLetter,
      correct: payload.correct,
      timeMs: payload.timeMs,
    });
    setAnswers((prev) => ({
      ...prev,
      [q.id]: {
        chosenLetter: payload.chosenLetter,
        correct: payload.correct,
        timeMs: payload.timeMs,
      },
    }));
  }

  async function handleRate(q: Question, grade: 1 | 2 | 3 | 4) {
    if (!userId) return;
    const currentReview = reviewsQuery.data?.get(q.id) ?? null;
    const next = applyRating(userId, q.id, currentReview, grade as Rating.Again);
    await upsertReviewMutation.mutateAsync(next);
    setAnswers((prev) => ({
      ...prev,
      [q.id]: { ...(prev[q.id] ?? { chosenLetter: null, correct: false, timeMs: 0 }), ratedGrade: grade },
    }));
  }

  function handleNext() {
    if (currentIdx < total - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      void finalizeMutation.mutateAsync().catch(() => {
        toast.error('Falha ao finalizar sessão (as respostas já estão salvas)');
      });
      setCurrentIdx(total); // move past end to show summary
    }
  }

  // --- loading / empty states ---
  if (questionsQuery.isLoading) {
    return <main className="p-8 text-sm">Carregando sessão…</main>;
  }
  if (questionsQuery.isError) {
    return (
      <main className="p-8 text-sm">
        Erro ao carregar: {(questionsQuery.error as Error).message}
      </main>
    );
  }
  if (total === 0) {
    return (
      <main className="mx-auto max-w-xl space-y-4 p-8 text-sm">
        <h1 className="text-2xl font-semibold">Sessão vazia</h1>
        <p className="text-muted-foreground">
          Nenhuma questão bate com os filtros escolhidos. Tente ajustar disciplinas, dificuldade
          ou modo.
        </p>
        <Link href="/praticar" className={buttonVariants()}>
          Nova configuração
        </Link>
      </main>
    );
  }

  // --- summary at end ---
  if (currentIdx >= total || session.finalizada) {
    const entries = Object.values(answers);
    const correctN = entries.filter((a) => a.correct).length;
    const totalTimeMs = entries.reduce((acc, a) => acc + (a.timeMs ?? 0), 0);
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-4 md:p-8">
        <h1 className="text-2xl font-semibold">Sessão finalizada</h1>
        <Card>
          <CardContent className="space-y-2 pt-6 text-sm">
            <div>
              Acertos: <span className="font-semibold">{correctN}</span> / {total} (
              {total > 0 ? Math.round((correctN / total) * 100) : 0}%)
            </div>
            <div>
              Tempo total:{' '}
              <span className="font-semibold">
                {Math.floor(totalTimeMs / 60000)}m {Math.floor((totalTimeMs % 60000) / 1000)}s
              </span>
            </div>
            <div>
              Tempo médio:{' '}
              <span className="font-semibold">
                {entries.length > 0
                  ? `${Math.round(totalTimeMs / entries.length / 1000)}s/q`
                  : '—'}
              </span>
            </div>
          </CardContent>
        </Card>
        <div className="flex gap-2">
          <Link href="/praticar" className={buttonVariants()}>
            Nova sessão
          </Link>
          <Link
            href="/dashboard"
            className={buttonVariants({ variant: 'outline' })}
          >
            Voltar ao dashboard
          </Link>
        </div>
      </main>
    );
  }

  const q = currentQuestion!;
  const disc = disciplineById.get(q.discipline_id);
  const topic = q.topic_id ? topicById.get(q.topic_id) : null;

  return (
    <main className="px-4 py-6 md:p-8">
      <QuestionCard
        question={q}
        disciplineLabel={disc?.short_name ?? disc?.name ?? null}
        disciplineColor={disc?.cor_hex ?? null}
        topicLabel={topic ?? q.tema ?? null}
        indexInSession={{ current: currentIdx + 1, total }}
        mode="review"
        askFsrsRating={session.config.ask_fsrs_rating !== false}
        timerSeconds={session.config.timer_per_question_s ?? null}
        onSubmit={(payload) => handleSubmit(q, payload)}
        onRateFsrs={(grade) => handleRate(q, grade as 1 | 2 | 3 | 4)}
        onNext={handleNext}
      />
      {answers[q.id] && (
        <div className="mx-auto mt-4 w-full max-w-3xl">
          <QuestionFeedback questionId={q.id} onDeleted={handleNext} />
        </div>
      )}
    </main>
  );
}
