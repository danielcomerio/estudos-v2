'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { GitFork, Star } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useDisciplines } from '@/hooks/use-disciplines';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function renderStars(score: number): string {
  // score in [-1..1] → 0..5 stars
  const full = Math.max(0, Math.min(5, Math.round(((score + 1) / 2) * 5)));
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

export default function ComunidadePage() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();
  const { data: disciplineData } = useDisciplines();

  const [disciplineId, setDisciplineId] = useState<string>('all');
  const [banca, setBanca] = useState<string>('');
  const [minQuality, setMinQuality] = useState<number>(0);

  const disciplineById = useMemo(() => {
    const m = new Map<string, { name: string; short_name: string | null; cor_hex: string | null }>();
    for (const d of disciplineData?.disciplines ?? []) {
      m.set(d.id, { name: d.name, short_name: d.short_name, cor_hex: d.cor_hex });
    }
    return m;
  }, [disciplineData]);

  const feedQuery = useQuery({
    queryKey: ['public-feed', disciplineId, banca, minQuality],
    queryFn: async () => {
      let builder = supabase
        .from('public_questions_feed')
        .select('*')
        .gte('quality_score', minQuality)
        .order('quality_score', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);
      if (disciplineId !== 'all') builder = builder.eq('discipline_id', disciplineId);
      if (banca.trim().length > 0) builder = builder.ilike('banca_estilo', `%${banca.trim()}%`);
      const { data, error } = await builder;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60 * 1000,
  });

  const forkMutation = useMutation({
    mutationFn: async (questionId: string) => {
      const res = await fetch(`/api/questions/fork/${questionId}`, { method: 'POST' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      const json = (await res.json()) as { new_id: string };
      return json.new_id;
    },
    onSuccess: async (newId) => {
      await queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast.success(`Adicionada ao seu banco (id ${newId.slice(0, 8)}…)`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rows = feedQuery.data ?? [];

  return (
    <main className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Comunidade</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Questões públicas de outros usuários. Ao fazer fork de uma questão, ela entra no seu
          banco privado e você passa a poder praticá-la, revisá-la e editá-la sem afetar a
          original.
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-4 pt-6 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Disciplina</Label>
            <Select value={disciplineId} onValueChange={(v) => setDisciplineId(v ?? 'all')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {disciplineData?.disciplines.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.short_name ?? d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="banca">Banca</Label>
            <Input
              id="banca"
              placeholder="FGV, CESPE…"
              value={banca}
              onChange={(e) => setBanca(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="minQ">Quality mínima</Label>
            <Input
              id="minQ"
              type="number"
              min={-1}
              max={1}
              step={0.1}
              value={minQuality}
              onChange={(e) => setMinQuality(Math.max(-1, Math.min(1, Number(e.target.value) || 0)))}
            />
          </div>
        </CardContent>
      </Card>

      {feedQuery.isLoading && <p className="text-muted-foreground text-sm">Carregando feed…</p>}
      {!feedQuery.isLoading && rows.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma questão pública ainda. Torne alguma sua pública em{' '}
            <Link href="/banco" className="underline underline-offset-2">
              /banco
            </Link>
            .
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {rows.map((q) => {
          const disc = q.discipline_id ? disciplineById.get(q.discipline_id) : null;
          return (
            <Card key={q.id ?? ''}>
              <CardContent className="space-y-3 py-4">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge
                    variant="outline"
                    style={disc?.cor_hex ? { borderColor: `${disc.cor_hex}66` } : undefined}
                  >
                    {disc?.short_name ?? disc?.name ?? '—'}
                  </Badge>
                  {q.tema && <span className="text-muted-foreground">{q.tema}</span>}
                  {q.dificuldade !== null && <Badge variant="outline">Dif. {q.dificuldade}</Badge>}
                  {q.banca_estilo && <Badge variant="outline">{q.banca_estilo}</Badge>}
                  <div className="flex-1" />
                  <span
                    className="text-amber-500"
                    title={`quality ${(q.quality_score ?? 0).toFixed(2)}`}
                  >
                    <Star className="mr-1 inline h-3 w-3 fill-current" aria-hidden />
                    {renderStars(q.quality_score ?? 0)}
                  </span>
                </div>
                <p className="line-clamp-3 text-sm">{q.enunciado}</p>
                <div className="flex items-center justify-between">
                  <div className="text-muted-foreground text-xs">
                    por{' '}
                    {q.author_handle && q.author_is_public ? (
                      <Link
                        href={`/u/${q.author_handle}`}
                        className="text-foreground underline underline-offset-2"
                      >
                        @{q.author_handle}
                      </Link>
                    ) : (
                      q.author_name ?? 'anônimo'
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => q.id && forkMutation.mutate(q.id)}
                    disabled={forkMutation.isPending || !q.id}
                  >
                    <GitFork className="mr-2 h-4 w-4" aria-hidden />
                    Adicionar ao meu banco
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
