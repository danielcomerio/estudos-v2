'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Clock, GraduationCap, Sparkles } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useUserData } from '@/hooks/use-user-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { StudySessionConfig } from '@/types';

export default function RevisarPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const { data: userData } = useUserData();
  const userId = userData?.user.id;
  const studyProfileId = userData?.activeStudyProfile?.id ?? null;

  const [includeNew, setIncludeNew] = useState(true);
  const [limit, setLimit] = useState(20);

  const counts = useQuery({
    queryKey: ['fsrs-counts', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const [totalRes, reviewedRes, dueRes] = await Promise.all([
        supabase
          .from('questions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId!)
          .is('deleted_at', null),
        supabase
          .from('reviews')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId!),
        supabase
          .from('reviews')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId!)
          .not('due', 'is', null)
          .lte('due', nowIso),
      ]);

      const totalQuestions = totalRes.count ?? 0;
      const reviewedQuestions = reviewedRes.count ?? 0;
      const dueCount = dueRes.count ?? 0;
      const newCount = Math.max(0, totalQuestions - reviewedQuestions);

      return { totalQuestions, reviewedQuestions, dueCount, newCount };
    },
    staleTime: 30 * 1000,
  });

  const sessionTarget = useMemo(() => {
    if (!counts.data) return 0;
    const base = counts.data.dueCount + (includeNew ? counts.data.newCount : 0);
    return Math.min(limit, base);
  }, [counts.data, includeNew, limit]);

  const startMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !studyProfileId) throw new Error('Sem perfil de estudo ativo');
      const config: StudySessionConfig = {
        modo: 'fsrs_due',
        ask_fsrs_rating: true,
        show_gabarito: true,
      };
      const { data, error } = await supabase
        .from('study_sessions')
        .insert({
          user_id: userId,
          study_profile_id: studyProfileId,
          nome: 'Revisão FSRS',
          config,
          modo: 'fsrs',
          num_questoes_alvo: Math.max(1, sessionTarget),
        })
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (id) => router.push(`/praticar/${id}`),
    onError: (err: Error) => toast.error(err.message || 'Falha ao iniciar revisão'),
  });

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Revisar</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Questões que o FSRS já agendou para revisão agora, e as que você nunca respondeu.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex flex-col gap-1 pt-6">
            <div className="text-muted-foreground flex items-center gap-2 text-xs uppercase">
              <Clock className="h-4 w-4" aria-hidden /> Vencidas
            </div>
            <div className="text-3xl font-semibold tabular-nums">
              {counts.data?.dueCount ?? '—'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 pt-6">
            <div className="text-muted-foreground flex items-center gap-2 text-xs uppercase">
              <Sparkles className="h-4 w-4" aria-hidden /> Novas
            </div>
            <div className="text-3xl font-semibold tabular-nums">
              {counts.data?.newCount ?? '—'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 pt-6">
            <div className="text-muted-foreground flex items-center gap-2 text-xs uppercase">
              <GraduationCap className="h-4 w-4" aria-hidden /> Total banco
            </div>
            <div className="text-3xl font-semibold tabular-nums">
              {counts.data?.totalQuestions ?? '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurar revisão</CardTitle>
          <CardDescription>Sessões curtas rendem mais que maratonas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={includeNew}
              onCheckedChange={(v) => setIncludeNew(Boolean(v))}
            />
            Incluir questões novas (nunca revisadas)
          </label>
          <div className="space-y-2">
            <Label htmlFor="limit">Limite de questões</Label>
            <Input
              id="limit"
              type="number"
              min={1}
              max={200}
              value={limit}
              onChange={(e) => setLimit(Math.max(1, Math.min(200, Number(e.target.value) || 1)))}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          disabled={sessionTarget <= 0 || startMutation.isPending || !studyProfileId}
          onClick={() => startMutation.mutate()}
        >
          {startMutation.isPending
            ? 'Criando…'
            : sessionTarget <= 0
              ? 'Nada pra revisar'
              : `Revisar ${sessionTarget} ${sessionTarget === 1 ? 'questão' : 'questões'}`}
        </Button>
      </div>
    </main>
  );
}
