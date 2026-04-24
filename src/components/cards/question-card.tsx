'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronRight, Flag, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { RATING_LABELS, Rating } from '@/lib/fsrs';
import type { Question, Alternativa } from '@/types';
import { parseAlternativas } from '@/types';

type Grade = Rating.Again | Rating.Hard | Rating.Good | Rating.Easy;

export type QuestionCardMode = 'review' | 'simulado';

type Props = {
  question: Question;
  disciplineLabel?: string | null;
  disciplineColor?: string | null;
  topicLabel?: string | null;
  indexInSession: { current: number; total: number };
  mode: QuestionCardMode;
  askFsrsRating?: boolean;
  timerSeconds?: number | null;
  flagged?: boolean;
  onFlag?: () => void;
  onSubmit: (payload: { chosenLetter: string | null; timeMs: number; correct: boolean }) => Promise<void>;
  onRateFsrs?: (rating: Grade) => Promise<void>;
  onNext: () => void;
  onSkip?: () => void;
};

function difficultyStars(d: number): string {
  return '★'.repeat(d) + '☆'.repeat(5 - d);
}

export function QuestionCard({
  question,
  disciplineLabel,
  disciplineColor,
  topicLabel,
  indexInSession,
  mode,
  askFsrsRating = false,
  timerSeconds,
  flagged,
  onFlag,
  onSubmit,
  onRateFsrs,
  onNext,
  onSkip,
}: Props) {
  const alternativas = useMemo<Alternativa[]>(
    () => parseAlternativas(question.alternativas),
    [question.alternativas],
  );

  const [chosen, setChosen] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ratedGrade, setRatedGrade] = useState<Grade | null>(null);
  const [expandedAlt, setExpandedAlt] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState(() => Date.now());

  // Timer state
  const [secondsLeft, setSecondsLeft] = useState<number | null>(
    typeof timerSeconds === 'number' && timerSeconds > 0 ? timerSeconds : null,
  );

  // Reset local state whenever the question id changes.
  useEffect(() => {
    setChosen(null);
    setSubmitted(false);
    setRatedGrade(null);
    setExpandedAlt(null);
    setStartedAt(Date.now());
    setSecondsLeft(typeof timerSeconds === 'number' && timerSeconds > 0 ? timerSeconds : null);
  }, [question.id, timerSeconds]);

  // Countdown timer (only runs before submission).
  useEffect(() => {
    if (secondsLeft === null || submitted) return;
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft, submitted]);

  // Auto-submit on timeout.
  useEffect(() => {
    if (secondsLeft === 0 && !submitted) {
      void handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  async function handleSubmit() {
    if (submitting || submitted) return;
    setSubmitting(true);
    try {
      const correctAlt = alternativas.find((a) => a.correta);
      const correct = chosen !== null && correctAlt?.letra === chosen;
      await onSubmit({
        chosenLetter: chosen,
        timeMs: Date.now() - startedAt,
        correct,
      });
      setSubmitted(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar resposta';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRate(grade: Grade) {
    if (!onRateFsrs) return;
    try {
      await onRateFsrs(grade);
      setRatedGrade(grade);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao registrar FSRS';
      toast.error(message);
    }
  }

  const correctAlt = alternativas.find((a) => a.correta);
  const showAnswers = mode === 'review' && submitted;
  const canGoNext = submitted && (!askFsrsRating || ratedGrade !== null || mode === 'simulado');

  return (
    <Card className="mx-auto w-full max-w-3xl">
      <CardContent className="space-y-6 py-6">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="outline">
            {indexInSession.current}/{indexInSession.total}
          </Badge>
          {disciplineLabel && (
            <Badge
              variant="outline"
              style={disciplineColor ? { borderColor: `${disciplineColor}66` } : undefined}
            >
              {disciplineLabel}
            </Badge>
          )}
          {topicLabel && <span className="text-muted-foreground">{topicLabel}</span>}
          <Badge variant="outline" title={`Dificuldade ${question.dificuldade}`}>
            {difficultyStars(question.dificuldade)}
          </Badge>
          {question.banca_estilo && <Badge variant="outline">{question.banca_estilo}</Badge>}
          <div className="flex-1" />
          {secondsLeft !== null && !submitted && (
            <span
              className={cn(
                'font-mono text-xs tabular-nums',
                secondsLeft <= 10 && 'text-destructive font-semibold',
              )}
              aria-live="polite"
            >
              ⏱ {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
            </span>
          )}
          {mode === 'simulado' && onFlag && (
            <Button
              type="button"
              variant={flagged ? 'default' : 'outline'}
              size="sm"
              onClick={onFlag}
            >
              <Flag className="mr-1 h-3 w-3" aria-hidden />
              {flagged ? 'Desfazer flag' : 'Flag'}
            </Button>
          )}
        </div>

        <div className="text-sm whitespace-pre-wrap">{question.enunciado}</div>

        <div className="space-y-2">
          {alternativas.map((alt) => {
            const isChosen = chosen === alt.letra;
            const isCorrect = alt.correta;
            const wrongChosen = showAnswers && isChosen && !isCorrect;
            const correctReveal = showAnswers && isCorrect;

            return (
              <div key={alt.letra}>
                <button
                  type="button"
                  onClick={() => !submitted && setChosen(alt.letra)}
                  disabled={submitted}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-md border p-3 text-left text-sm transition-colors',
                    'hover:bg-accent/30 disabled:cursor-default',
                    isChosen && !submitted && 'border-ring bg-accent/40',
                    correctReveal && 'border-emerald-500/60 bg-emerald-500/10',
                    wrongChosen && 'border-red-500/60 bg-red-500/10',
                  )}
                  aria-pressed={isChosen}
                >
                  <div
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                      isChosen && !submitted && 'border-ring',
                      correctReveal && 'border-emerald-500 text-emerald-600',
                      wrongChosen && 'border-red-500 text-red-600',
                    )}
                  >
                    {correctReveal ? (
                      <Check className="h-3 w-3" aria-hidden />
                    ) : wrongChosen ? (
                      <X className="h-3 w-3" aria-hidden />
                    ) : (
                      alt.letra
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="leading-snug">{alt.texto}</div>
                    {showAnswers && alt.explicacao && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedAlt(expandedAlt === alt.letra ? null : alt.letra);
                        }}
                        className="text-muted-foreground text-xs underline underline-offset-2"
                      >
                        {expandedAlt === alt.letra ? 'ocultar' : 'por que?'}
                      </button>
                    )}
                    {showAnswers && expandedAlt === alt.letra && (
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        {alt.explicacao}
                      </p>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {showAnswers && (
          <div className="bg-muted/40 space-y-3 rounded-md p-4 text-sm">
            <div>
              <span className="text-muted-foreground">Gabarito: </span>
              <span className="font-semibold">{question.gabarito}</span>
              {correctAlt && <span className="text-muted-foreground"> — {correctAlt.texto}</span>}
            </div>
            {question.explicacao_geral && (
              <div>
                <div className="text-muted-foreground text-xs font-medium uppercase">
                  Explicação
                </div>
                <p className="mt-1 leading-relaxed whitespace-pre-wrap">{question.explicacao_geral}</p>
              </div>
            )}
            {Array.isArray(question.pegadinhas) && question.pegadinhas.length > 0 && (
              <div>
                <div className="text-muted-foreground text-xs font-medium uppercase">
                  Pegadinhas
                </div>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-xs">
                  {question.pegadinhas.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {showAnswers && askFsrsRating && onRateFsrs && (
          <div className="space-y-2">
            <div className="text-muted-foreground text-xs font-medium uppercase">
              Como foi essa? (FSRS)
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {([Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as const).map((g) => (
                <Button
                  key={g}
                  type="button"
                  variant={ratedGrade === g ? 'default' : 'outline'}
                  onClick={() => handleRate(g)}
                  disabled={ratedGrade !== null}
                >
                  {RATING_LABELS[g]}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          {!submitted && onSkip && (
            <Button type="button" variant="ghost" onClick={onSkip}>
              Pular
            </Button>
          )}
          <div className="flex-1" />
          {!submitted ? (
            <Button
              type="button"
              disabled={chosen === null || submitting}
              onClick={() => void handleSubmit()}
            >
              {submitting ? 'Salvando…' : 'Confirmar resposta'}
            </Button>
          ) : (
            <Button type="button" disabled={!canGoNext} onClick={onNext}>
              Próxima <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
