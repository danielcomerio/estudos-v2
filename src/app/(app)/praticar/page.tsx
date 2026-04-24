'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useUserData } from '@/hooks/use-user-data';
import { useDisciplines } from '@/hooks/use-disciplines';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { StudyMode, StudySessionConfig } from '@/types';

const MODO_OPTIONS: { value: StudyMode; label: string }[] = [
  { value: 'aleatorio', label: 'Aleatório' },
  { value: 'recentes', label: 'Mais recentes primeiro' },
  { value: 'ordem', label: 'Mais antigas primeiro' },
  { value: 'quality', label: 'Melhor qualidade primeiro' },
  { value: 'fsrs_due', label: 'FSRS: só vencidas' },
  { value: 'repetir_erradas', label: 'Repetir que errei' },
];

const QTD_OPTIONS = [5, 10, 15, 20, 30, 50, 100];
const TIMER_OPTIONS: { value: string; label: string }[] = [
  { value: '0', label: 'Sem timer' },
  { value: '60', label: '1 min/q' },
  { value: '120', label: '2 min/q' },
  { value: '180', label: '3 min/q' },
];

export default function PraticarPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();
  const { data: userData } = useUserData();
  const { data: disciplineData } = useDisciplines();

  const [selectedDiscIds, setSelectedDiscIds] = useState<Set<string>>(new Set());
  const [diffMin, setDiffMin] = useState(1);
  const [diffMax, setDiffMax] = useState(5);
  const [modo, setModo] = useState<StudyMode>('aleatorio');
  const [qtd, setQtd] = useState<number>(10);
  const [timerS, setTimerS] = useState<number>(0);
  const [askFsrsRating, setAskFsrsRating] = useState<boolean>(true);
  const [showGabarito, setShowGabarito] = useState<boolean>(true);

  const activeStudyProfileId = userData?.activeStudyProfile?.id ?? null;
  const disciplines = disciplineData?.disciplines ?? [];

  const allSelected = useMemo(
    () => disciplines.length > 0 && selectedDiscIds.size === disciplines.length,
    [disciplines.length, selectedDiscIds.size],
  );

  function toggleDiscipline(id: string) {
    setSelectedDiscIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    if (allSelected) setSelectedDiscIds(new Set());
    else setSelectedDiscIds(new Set(disciplines.map((d) => d.id)));
  }

  const startMutation = useMutation({
    mutationFn: async () => {
      if (!userData?.user.id) throw new Error('Sem usuário');
      if (!activeStudyProfileId) throw new Error('Sem perfil de estudo ativo');

      const config: StudySessionConfig = {
        discipline_ids: selectedDiscIds.size > 0 ? Array.from(selectedDiscIds) : undefined,
        dificuldade_min: diffMin,
        dificuldade_max: diffMax,
        timer_per_question_s: timerS > 0 ? timerS : null,
        show_gabarito: showGabarito,
        ask_fsrs_rating: askFsrsRating,
        modo,
      };

      // Map StudyMode → study_sessions.modo check constraint
      // (aleatorio | ordem | fsrs | repetir_erradas)
      const dbModo =
        modo === 'fsrs_due' ? 'fsrs'
          : modo === 'repetir_erradas' ? 'repetir_erradas'
          : modo === 'aleatorio' ? 'aleatorio'
          : 'ordem';

      const { data, error } = await supabase
        .from('study_sessions')
        .insert({
          user_id: userData.user.id,
          study_profile_id: activeStudyProfileId,
          nome: null,
          config,
          modo: dbModo,
          num_questoes_alvo: qtd,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: async (id) => {
      await queryClient.invalidateQueries({ queryKey: ['study_sessions'] });
      router.push(`/praticar/${id}`);
    },
    onError: (err: Error) => toast.error(err.message || 'Falha ao iniciar'),
  });

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Praticar</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Configure a sessão e bora. Dá para usar mais tarde também — o estado fica salvo.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Disciplinas</CardTitle>
          <CardDescription>
            Marque uma ou mais — vazio = todas as disciplinas do seu perfil.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="disc-all"
              checked={allSelected}
              onCheckedChange={toggleAll}
              aria-label="Selecionar todas"
            />
            <Label htmlFor="disc-all" className="text-sm">
              Selecionar todas
            </Label>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {disciplines.map((d) => (
              <div key={d.id} className="flex items-center gap-2">
                <Checkbox
                  id={`disc-${d.id}`}
                  checked={selectedDiscIds.has(d.id)}
                  onCheckedChange={() => toggleDiscipline(d.id)}
                />
                <Label htmlFor={`disc-${d.id}`} className="flex-1 cursor-pointer text-sm">
                  {d.short_name ?? d.name}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modo e quantidade</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Modo</Label>
            <Select value={modo} onValueChange={(v) => setModo((v ?? 'aleatorio') as StudyMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODO_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Quantidade</Label>
            <Select value={String(qtd)} onValueChange={(v) => setQtd(Number(v ?? '10'))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QTD_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} questões
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="diff-min">Dificuldade mínima</Label>
            <Input
              id="diff-min"
              type="number"
              min={1}
              max={5}
              value={diffMin}
              onChange={(e) => setDiffMin(Math.min(5, Math.max(1, Number(e.target.value) || 1)))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="diff-max">Dificuldade máxima</Label>
            <Input
              id="diff-max"
              type="number"
              min={1}
              max={5}
              value={diffMax}
              onChange={(e) => setDiffMax(Math.min(5, Math.max(1, Number(e.target.value) || 5)))}
            />
          </div>
          <div className="space-y-2">
            <Label>Timer por questão</Label>
            <Select value={String(timerS)} onValueChange={(v) => setTimerS(Number(v ?? '0'))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMER_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col justify-end gap-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={showGabarito}
                onCheckedChange={(v) => setShowGabarito(Boolean(v))}
              />
              Mostrar gabarito e explicação após responder
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={askFsrsRating}
                onCheckedChange={(v) => setAskFsrsRating(Boolean(v))}
              />
              Pedir rating FSRS (Again/Hard/Good/Easy)
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={() => startMutation.mutate()}
          disabled={startMutation.isPending || !activeStudyProfileId}
        >
          {startMutation.isPending ? 'Criando sessão…' : 'Iniciar sessão'}
        </Button>
      </div>
    </main>
  );
}
