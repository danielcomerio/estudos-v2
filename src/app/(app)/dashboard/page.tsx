'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpenCheck,
  Clock,
  Database,
  Dumbbell,
  PenLine,
  Target,
  Trophy,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useUserData } from '@/hooks/use-user-data';
import { useDisciplines } from '@/hooks/use-disciplines';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = target.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function DashboardPage() {
  const supabase = getSupabaseClient();
  const { data: userData } = useUserData();
  const { data: disciplineData } = useDisciplines();
  const userId = userData?.user.id;
  const studyProfile = userData?.activeStudyProfile ?? null;

  const statsQuery = useQuery({
    queryKey: ['dashboard-stats', userId],
    enabled: Boolean(userId),
    staleTime: 30 * 1000,
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [
        totalQ,
        totalDisc,
        totalAttempts,
        correct7d,
        attempts7d,
        correct30d,
        attempts30d,
        dueNow,
        lastSimulados,
        attemptsByDiscipline,
      ] = await Promise.all([
        supabase
          .from('questions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId!)
          .is('deleted_at', null),
        supabase
          .from('discursives')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId!)
          .is('deleted_at', null),
        supabase
          .from('attempts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId!),
        supabase
          .from('attempts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId!)
          .eq('acertou', true)
          .gte('created_at', sevenDaysAgo.toISOString()),
        supabase
          .from('attempts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId!)
          .gte('created_at', sevenDaysAgo.toISOString()),
        supabase
          .from('attempts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId!)
          .eq('acertou', true)
          .gte('created_at', thirtyDaysAgo.toISOString()),
        supabase
          .from('attempts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId!)
          .gte('created_at', thirtyDaysAgo.toISOString()),
        supabase
          .from('reviews')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId!)
          .not('due', 'is', null)
          .lte('due', nowIso),
        supabase
          .from('simulados')
          .select('id, nome_snapshot, status, pontuacao_total, iniciado_em, finalizado_em')
          .eq('user_id', userId!)
          .order('iniciado_em', { ascending: false })
          .limit(5),
        supabase
          .from('attempts')
          .select('acertou, questions!inner(discipline_id)')
          .eq('user_id', userId!)
          .gte('created_at', thirtyDaysAgo.toISOString())
          .limit(1000),
      ]);

      // Aggregate per-discipline accuracy (last 30d)
      const byDisc = new Map<string, { total: number; correct: number }>();
      const rows = (attemptsByDiscipline.data ?? []) as Array<{
        acertou: boolean | null;
        questions: { discipline_id: string } | { discipline_id: string }[];
      }>;
      for (const r of rows) {
        const q = Array.isArray(r.questions) ? r.questions[0] : r.questions;
        if (!q) continue;
        const curr = byDisc.get(q.discipline_id) ?? { total: 0, correct: 0 };
        curr.total += 1;
        if (r.acertou) curr.correct += 1;
        byDisc.set(q.discipline_id, curr);
      }

      return {
        totalQuestions: totalQ.count ?? 0,
        totalDiscursives: totalDisc.count ?? 0,
        totalAttempts: totalAttempts.count ?? 0,
        acc7d: (attempts7d.count ?? 0) > 0
          ? (correct7d.count ?? 0) / (attempts7d.count ?? 1)
          : null,
        attempts7d: attempts7d.count ?? 0,
        acc30d: (attempts30d.count ?? 0) > 0
          ? (correct30d.count ?? 0) / (attempts30d.count ?? 1)
          : null,
        attempts30d: attempts30d.count ?? 0,
        dueNow: dueNow.count ?? 0,
        lastSimulados: lastSimulados.data ?? [],
        accuracyByDiscipline: byDisc,
      };
    },
  });

  const disciplineById = useMemo(() => {
    const m = new Map<string, { name: string; short_name: string | null; cor_hex: string | null }>();
    for (const d of disciplineData?.disciplines ?? []) {
      m.set(d.id, { name: d.name, short_name: d.short_name, cor_hex: d.cor_hex });
    }
    return m;
  }, [disciplineData]);

  const daysToProva = daysUntil(studyProfile?.data_prova);
  const stats = statsQuery.data;

  return (
    <main className="space-y-8 p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            {studyProfile?.nome_concurso ?? studyProfile?.nome ?? 'Perfil de estudo'}
          </p>
        </div>
        {daysToProva !== null && (
          <Card>
            <CardContent className="px-4 py-2 text-right">
              <div className="text-muted-foreground text-xs uppercase">Dias pra prova</div>
              <div className="text-2xl font-semibold tabular-nums">
                {daysToProva > 0 ? daysToProva : daysToProva === 0 ? 'hoje' : 'passou'}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick stats */}
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Vencidas agora"
          value={stats?.dueNow ?? '—'}
          href="/revisar"
          cta="revisar"
        />
        <StatCard
          icon={<Target className="h-4 w-4" />}
          label="Taxa de acerto 7d"
          value={
            stats?.acc7d !== null && stats?.acc7d !== undefined
              ? `${Math.round(stats.acc7d * 100)}%`
              : '—'
          }
          sub={stats ? `${stats.attempts7d} tentativas` : ''}
        />
        <StatCard
          icon={<Database className="h-4 w-4" />}
          label="Objetivas no banco"
          value={stats?.totalQuestions ?? '—'}
          href="/banco"
          cta="ver banco"
        />
        <StatCard
          icon={<PenLine className="h-4 w-4" />}
          label="Discursivas no banco"
          value={stats?.totalDiscursives ?? '—'}
          href="/discursivas"
          cta="responder"
        />
      </section>

      {/* Accuracy by discipline (simple bars) */}
      <section className="space-y-3">
        <h2 className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
          Acerto por disciplina (30d)
        </h2>
        <Card>
          <CardContent className="space-y-3 pt-6">
            {(disciplineData?.disciplines ?? []).map((d) => {
              const rec = stats?.accuracyByDiscipline.get(d.id);
              const pct = rec && rec.total > 0 ? rec.correct / rec.total : null;
              const pctLabel = pct !== null ? `${Math.round(pct * 100)}%` : '—';
              return (
                <div key={d.id} className="grid grid-cols-[10rem_1fr_4rem] items-center gap-3 text-sm">
                  <div className="truncate">{d.short_name ?? d.name}</div>
                  <div className="bg-muted h-2 overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: pct === null ? '0%' : `${Math.round(pct * 100)}%`,
                        backgroundColor: d.cor_hex ?? 'var(--primary)',
                      }}
                    />
                  </div>
                  <div className="text-right tabular-nums">
                    {pctLabel}
                    {rec && (
                      <span className="text-muted-foreground ml-1 text-[10px]">
                        ({rec.correct}/{rec.total})
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {stats && stats.attempts30d === 0 && (
              <p className="text-muted-foreground text-xs">
                Sem tentativas nos últimos 30 dias ainda. Inicia uma sessão em /praticar.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Last simulados */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
            Últimos simulados
          </h2>
          <Link
            href="/simulado"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            ver todos
          </Link>
        </div>
        {stats?.lastSimulados.length === 0 && (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Nenhum simulado ainda — crie um template em /simulado.
            </CardContent>
          </Card>
        )}
        {stats?.lastSimulados.map((s) => (
          <Card key={s.id}>
            <CardContent className="flex items-center justify-between py-3 text-sm">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Trophy className="text-amber-500 h-4 w-4" aria-hidden />
                  <span className="truncate font-medium">{s.nome_snapshot ?? '(sem nome)'}</span>
                  <Badge variant="outline" className="text-xs">
                    {s.status}
                  </Badge>
                </div>
                <div className="text-muted-foreground text-xs">
                  {new Date(s.iniciado_em).toLocaleString('pt-BR')}
                  {typeof s.pontuacao_total === 'number' &&
                    ` · ${s.pontuacao_total.toFixed(1)} pts`}
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

      {/* Quick actions */}
      <section className="flex flex-wrap gap-2">
        <Link href="/praticar" className={buttonVariants()}>
          <Dumbbell className="mr-2 h-4 w-4" aria-hidden />
          Praticar
        </Link>
        <Link href="/revisar" className={buttonVariants({ variant: 'outline' })}>
          <BookOpenCheck className="mr-2 h-4 w-4" aria-hidden />
          Revisar
        </Link>
        <Link href="/simulado" className={buttonVariants({ variant: 'outline' })}>
          Simulado
        </Link>
      </section>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  href,
  cta,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
  href?: string;
  cta?: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 pt-6">
        <div className="text-muted-foreground flex items-center gap-2 text-xs uppercase">
          {icon}
          <span>{label}</span>
        </div>
        <div className="text-3xl font-semibold tabular-nums">{value}</div>
        {sub && <div className="text-muted-foreground text-xs">{sub}</div>}
        {href && cta && (
          <Link href={href} className="text-xs underline underline-offset-2 mt-1">
            {cta} →
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
