'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useDisciplines } from '@/hooks/use-disciplines';
import { QuestionCard } from '@/components/cards/question-card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { parseAlternativas, type Question, type Simulado } from '@/types';

type AttemptMap = Record<string, { chosenLetter: string | null; correct: boolean; timeMs: number }>;

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

export function SimuladoRunner({ simulado, userId }: { simulado: Simulado; userId: string }) {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();
  const { data: disciplineData } = useDisciplines();

  const disciplineById = useMemo(() => {
    const m = new Map<string, { name: string; short_name: string | null; cor_hex: string | null }>();
    for (const d of disciplineData?.disciplines ?? []) {
      m.set(d.id, { name: d.name, short_name: d.short_name, cor_hex: d.cor_hex });
    }
    return m;
  }, [disciplineData]);

  const qIds = useMemo(() => simulado.questoes_ids ?? [], [simulado.questoes_ids]);

  const questionsQuery = useQuery({
    queryKey: ['simulado-questions', simulado.id],
    staleTime: Infinity,
    queryFn: async () => {
      if (qIds.length === 0) return [] as Question[];
      const { data, error } = await supabase.from('questions').select('*').in('id', qIds);
      if (error) throw error;
      const byId = new Map((data ?? []).map((q) => [q.id, q]));
      return qIds.map((id) => byId.get(id)).filter((q): q is Question => Boolean(q));
    },
  });

  // Timer. tempo_total_ms stored in simulado = number of elapsed ms when resumed;
  // we compute a deadline based on iniciado_em + template.tempo_minutos... but
  // the template may not be loaded. For MVP, compute from iniciado_em + fixed
  // tempo_minutos (fetched alongside the template). Here we use a simple
  // per-session timer that runs from the first render.
  const [startedAt] = useState<number>(Date.now());
  const [elapsedMs, setElapsedMs] = useState(0);
  useEffect(() => {
    if (simulado.status !== 'em_andamento') return;
    const id = setInterval(() => setElapsedMs(Date.now() - startedAt), 1000);
    return () => clearInterval(id);
  }, [startedAt, simulado.status]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<AttemptMap>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set(simulado.flags ?? []));

  const saveAttemptMutation = useMutation({
    mutationFn: async (payload: {
      question: Question;
      chosenLetter: string | null;
      correct: boolean;
      timeMs: number;
    }) => {
      const { error } = await supabase.from('attempts').insert({
        user_id: userId,
        question_id: payload.question.id,
        simulado_id: simulado.id,
        resposta_letra: payload.chosenLetter,
        acertou: payload.correct,
        tempo_gasto_ms: payload.timeMs,
      });
      if (error) throw error;
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      // Pontuação por disciplina depende de pontos_por_questao no study_profile_disciplines.
      const { data: spd } = simulado.template_id
        ? await supabase
            .from('study_profile_disciplines')
            .select('discipline_id, pontos_por_questao')
            .eq('study_profile_id', simulado.user_id) // fallback — refined below
        : { data: null };
      // Refined: look up via the simulado's template → study_profile_id.
      let pontosPorDisc = new Map<string, number>();
      if (simulado.template_id) {
        const { data: tmpl } = await supabase
          .from('simulado_templates')
          .select('study_profile_id')
          .eq('id', simulado.template_id)
          .maybeSingle();
        if (tmpl?.study_profile_id) {
          const { data } = await supabase
            .from('study_profile_disciplines')
            .select('discipline_id, pontos_por_questao')
            .eq('study_profile_id', tmpl.study_profile_id);
          pontosPorDisc = new Map((data ?? []).map((r) => [r.discipline_id, Number(r.pontos_por_questao ?? 1)]));
        }
      }
      // Compute score from the in-memory answers + the question list.
      const questions = questionsQuery.data ?? [];
      let total = 0;
      for (const q of questions) {
        const ans = answers[q.id];
        if (ans?.correct) {
          total += pontosPorDisc.get(q.discipline_id) ?? 1;
        }
      }

      const { error } = await supabase
        .from('simulados')
        .update({
          status: 'finalizado',
          finalizado_em: new Date().toISOString(),
          tempo_total_ms: Date.now() - startedAt,
          pontuacao_objetiva: total,
          pontuacao_total: total,
          flags: Array.from(flagged),
        })
        .eq('id', simulado.id);
      if (error) throw error;
      return total;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['simulados-recent'] });
      toast.success('Simulado finalizado');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  async function handleSubmit(
    q: Question,
    payload: { chosenLetter: string | null; timeMs: number; correct: boolean },
  ) {
    // In simulado mode, acertou is computed but NOT shown; still tracked for scoring.
    const alts = parseAlternativas(q.alternativas);
    const correctLetter = alts.find((a) => a.correta)?.letra ?? q.gabarito;
    const correct = payload.chosenLetter === correctLetter;
    await saveAttemptMutation.mutateAsync({ question: q, ...payload, correct });
    setAnswers((prev) => ({
      ...prev,
      [q.id]: { chosenLetter: payload.chosenLetter, correct, timeMs: payload.timeMs },
    }));
  }

  function toggleFlag(id: string) {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const questions = questionsQuery.data ?? [];

  if (questionsQuery.isLoading) {
    return <main className="p-8 text-sm">Carregando simulado…</main>;
  }

  // --- already finalizado: results view ---
  if (simulado.status === 'finalizado') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-4 md:p-8">
        <h1 className="text-2xl font-semibold">Resultado do simulado</h1>
        <Card>
          <CardContent className="space-y-2 pt-6 text-sm">
            <div>
              Status: <Badge>{simulado.status}</Badge>
            </div>
            <div>
              Pontuação total:{' '}
              <span className="font-semibold">
                {simulado.pontuacao_total?.toFixed(1) ?? '—'}
              </span>
            </div>
            <div>
              Tempo total:{' '}
              <span className="font-semibold tabular-nums">
                {simulado.tempo_total_ms
                  ? formatTime(Math.floor(simulado.tempo_total_ms / 1000))
                  : '—'}
              </span>
            </div>
            <div>Questões: {questions.length}</div>
            <div>Flags: {simulado.flags?.length ?? 0}</div>
          </CardContent>
        </Card>
        <div>
          <Link href="/simulado" className={buttonVariants()}>
            Voltar
          </Link>
        </div>
      </main>
    );
  }

  // --- running simulado ---
  const q = questions[currentIdx];
  const answeredCount = Object.keys(answers).length;
  const disc = q ? disciplineById.get(q.discipline_id) : null;

  return (
    <main className="space-y-4 px-4 py-4 md:p-8">
      <div className="bg-background/80 border-border sticky top-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-b px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="text-xs tabular-nums">
          ⏱ <span className="font-mono font-semibold">{formatTime(Math.floor(elapsedMs / 1000))}</span>
        </div>
        <div className="text-muted-foreground text-xs">
          {answeredCount}/{questions.length} respondidas · {flagged.size} flags
        </div>
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (confirm('Finalizar simulado agora?')) {
              void finalizeMutation.mutateAsync();
            }
          }}
          disabled={finalizeMutation.isPending}
        >
          Finalizar
        </Button>
      </div>

      <div className="grid grid-cols-10 gap-1 md:grid-cols-20">
        {questions.map((qq, i) => {
          const state = answers[qq.id]
            ? 'answered'
            : flagged.has(qq.id)
              ? 'flagged'
              : 'pending';
          return (
            <button
              key={qq.id}
              type="button"
              onClick={() => setCurrentIdx(i)}
              className={cn(
                'aspect-square rounded-sm border text-xs tabular-nums transition-colors',
                i === currentIdx && 'ring-ring ring-2',
                state === 'answered' && 'bg-emerald-500/30 border-emerald-500/40',
                state === 'flagged' && 'bg-amber-500/30 border-amber-500/40',
                state === 'pending' && 'bg-muted/40 hover:bg-muted/70',
              )}
              aria-label={`Questão ${i + 1}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {q && (
        <QuestionCard
          question={q}
          disciplineLabel={disc?.short_name ?? disc?.name ?? null}
          disciplineColor={disc?.cor_hex ?? null}
          topicLabel={q.tema ?? null}
          indexInSession={{ current: currentIdx + 1, total: questions.length }}
          mode="simulado"
          askFsrsRating={false}
          flagged={flagged.has(q.id)}
          onFlag={() => toggleFlag(q.id)}
          onSubmit={(payload) => handleSubmit(q, payload)}
          onNext={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
          onSkip={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
        />
      )}
    </main>
  );
}
