'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Play, Trash2 } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useUserData } from '@/hooks/use-user-data';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { SimuladoTemplate } from '@/types';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function SimuladoListPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const { data: userData } = useUserData();
  const userId = userData?.user.id;
  const queryClient = useQueryClient();

  const templatesQuery = useQuery({
    queryKey: ['simulado_templates', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('simulado_templates')
        .select('*')
        .eq('user_id', userId!)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const recentQuery = useQuery({
    queryKey: ['simulados-recent', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('simulados')
        .select('id, nome_snapshot, iniciado_em, finalizado_em, status, pontuacao_total')
        .eq('user_id', userId!)
        .order('iniciado_em', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  const startMutation = useMutation({
    mutationFn: async (template: SimuladoTemplate) => {
      if (!userId) throw new Error('Sem usuário');

      // Pick questions per cota.
      const cotas = (template.cotas ?? {}) as Record<string, number>;
      const allIds: string[] = [];

      for (const [disciplineId, count] of Object.entries(cotas)) {
        const n = Number(count) || 0;
        if (n <= 0) continue;

        let builder = supabase
          .from('questions')
          .select('id, quality_score')
          .eq('user_id', userId)
          .eq('discipline_id', disciplineId)
          .is('deleted_at', null)
          .gte('dificuldade', template.dificuldade_min)
          .lte('dificuldade', template.dificuldade_max);

        if (template.criterio_selecao === 'quality_score') {
          builder = builder.order('quality_score', { ascending: false }).limit(n);
        } else {
          builder = builder.limit(Math.max(n * 4, n));
        }
        const { data, error } = await builder;
        if (error) throw error;
        const ids = (data ?? []).map((r) => r.id);
        const picked =
          template.criterio_selecao === 'quality_score' ? ids.slice(0, n) : shuffle(ids).slice(0, n);
        allIds.push(...picked);
      }

      if (allIds.length === 0) {
        throw new Error(
          'Nenhuma questão encontrada pelas cotas desse template. Importe questões ou ajuste o template.',
        );
      }

      const questoesIds = shuffle(allIds);

      const { data: simulado, error: insErr } = await supabase
        .from('simulados')
        .insert({
          user_id: userId,
          template_id: template.id,
          nome_snapshot: template.nome,
          questoes_ids: questoesIds,
          discursivas_ids: [],
          status: 'em_andamento',
        })
        .select('id')
        .single();
      if (insErr) throw insErr;
      return simulado.id;
    },
    onSuccess: async (id) => {
      await queryClient.invalidateQueries({ queryKey: ['simulados-recent', userId] });
      router.push(`/simulado/run/${id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('simulado_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['simulado_templates', userId] }),
  });

  const templates = templatesQuery.data ?? [];
  const recents = recentQuery.data ?? [];

  return (
    <main className="space-y-8 p-4 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Simulado</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Crie templates reutilizáveis (cotas, tempo, critério) e rode quando quiser.
          </p>
        </div>
        <Link href="/simulado/novo" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          Novo template
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Templates
        </h2>
        {templatesQuery.isLoading && <p className="text-sm">Carregando…</p>}
        {templates.length === 0 && !templatesQuery.isLoading && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Você ainda não tem nenhum template. Crie o primeiro para começar.
            </CardContent>
          </Card>
        )}
        {templates.map((t) => {
          const cotas = (t.cotas ?? {}) as Record<string, number>;
          const cotaSum = Object.values(cotas).reduce((a, b) => a + (Number(b) || 0), 0);
          return (
            <Card key={t.id}>
              <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{t.nome}</span>
                    {t.is_default && <Badge>default</Badge>}
                    <Badge variant="outline">{t.criterio_selecao}</Badge>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {t.num_questoes_objetivas} obj
                    {t.num_discursivas > 0 && ` + ${t.num_discursivas} disc`}
                    {' em '}
                    {t.tempo_minutos} min · dif {t.dificuldade_min}–{t.dificuldade_max}
                    {cotaSum > 0 && ` · ${cotaSum} cotas`}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    onClick={() => startMutation.mutate(t)}
                    disabled={startMutation.isPending}
                  >
                    <Play className="mr-2 h-4 w-4" aria-hidden />
                    Iniciar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Apagar template "${t.nome}"?`)) deleteMutation.mutate(t.id);
                    }}
                    disabled={deleteMutation.isPending}
                    aria-label="Apagar template"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Simulados recentes
        </h2>
        {recents.length === 0 && !recentQuery.isLoading && (
          <p className="text-muted-foreground text-sm">Nenhum simulado ainda.</p>
        )}
        {recents.map((s) => (
          <Card key={s.id}>
            <CardContent className="flex items-center justify-between py-3 text-sm">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{s.nome_snapshot ?? '(sem nome)'}</span>
                  <Badge variant="outline" className="text-xs">
                    {s.status}
                  </Badge>
                </div>
                <div className="text-muted-foreground text-xs">
                  iniciado {new Date(s.iniciado_em).toLocaleString('pt-BR')}
                  {typeof s.pontuacao_total === 'number' &&
                    ` · pontuação ${s.pontuacao_total.toFixed(1)}`}
                </div>
              </div>
              <Link
                href={`/simulado/run/${s.id}`}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                abrir
              </Link>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
