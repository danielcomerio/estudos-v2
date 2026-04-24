'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FEEDBACK_MOTIVOS,
  FEEDBACK_MOTIVO_LABELS,
  type FeedbackBody,
} from '@/lib/validators/feedback';

type Vote = 1 | -1;
type Target = 'question' | 'explanation';

async function postFeedback(body: FeedbackBody): Promise<{ ok: boolean; deleted?: boolean }> {
  const res = await fetch('/api/feedback', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function QuestionFeedback({
  questionId,
  onDeleted,
}: {
  questionId: string;
  onDeleted?: () => void;
}) {
  const queryClient = useQueryClient();
  const [cast, setCast] = useState<Record<Target, Vote | null>>({
    question: null,
    explanation: null,
  });

  // Thumbs-down dialog
  const [dialogTarget, setDialogTarget] = useState<Target | null>(null);
  const [motivo, setMotivo] = useState<(typeof FEEDBACK_MOTIVOS)[number]>('outro');
  const [comentario, setComentario] = useState('');
  const [alsoDelete, setAlsoDelete] = useState(false);

  const mutation = useMutation({
    mutationFn: postFeedback,
    onSuccess: async (res, body) => {
      setCast((prev) => ({ ...prev, [body.target]: body.vote }));
      if (res.deleted) {
        await queryClient.invalidateQueries({ queryKey: ['questions'] });
        onDeleted?.();
      }
      toast.success(res.deleted ? 'Feedback enviado, questão excluída' : 'Feedback registrado');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function castUp(target: Target) {
    mutation.mutate({ question_id: questionId, target, vote: 1 });
  }

  function openDownDialog(target: Target) {
    setDialogTarget(target);
    setMotivo('outro');
    setComentario('');
    setAlsoDelete(false);
  }

  function submitDownDialog() {
    if (!dialogTarget) return;
    mutation.mutate({
      question_id: questionId,
      target: dialogTarget,
      vote: -1,
      motivo,
      comentario: comentario.trim() || undefined,
      also_delete: alsoDelete,
    });
    setDialogTarget(null);
  }

  function Buttons({ target, label }: { target: Target; label: string }) {
    const current = cast[target];
    return (
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs">{label}</span>
        <Button
          type="button"
          size="xs"
          variant={current === 1 ? 'default' : 'outline'}
          onClick={() => castUp(target)}
          disabled={mutation.isPending}
          aria-label={`${label}: curtir`}
        >
          <ThumbsUp className={cn('h-3 w-3', current === 1 && 'fill-current')} aria-hidden />
        </Button>
        <Button
          type="button"
          size="xs"
          variant={current === -1 ? 'default' : 'outline'}
          onClick={() => openDownDialog(target)}
          disabled={mutation.isPending}
          aria-label={`${label}: problema`}
        >
          <ThumbsDown className={cn('h-3 w-3', current === -1 && 'fill-current')} aria-hidden />
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="border-border/60 mt-4 flex flex-wrap items-center gap-4 border-t pt-3">
        <Buttons target="question" label="Questão" />
        <Buttons target="explanation" label="Explicação" />
      </div>

      <Dialog
        open={dialogTarget !== null}
        onOpenChange={(open) => !open && setDialogTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Qual o problema?</DialogTitle>
            <DialogDescription>
              Seu feedback ajusta o quality_score da questão automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Select
                value={motivo}
                onValueChange={(v) =>
                  setMotivo((v ?? 'outro') as (typeof FEEDBACK_MOTIVOS)[number])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEEDBACK_MOTIVOS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {FEEDBACK_MOTIVO_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fb-comentario">Comentário (opcional)</Label>
              <Textarea
                id="fb-comentario"
                rows={3}
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Detalhe o problema, se quiser"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={alsoDelete}
                onCheckedChange={(v) => setAlsoDelete(Boolean(v))}
              />
              Também excluir esta questão do meu banco
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogTarget(null)}>
              Cancelar
            </Button>
            <Button onClick={submitDownDialog} disabled={mutation.isPending}>
              Enviar feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
