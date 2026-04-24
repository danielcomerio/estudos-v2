'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Search, Trash2 } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useUserData } from '@/hooks/use-user-data';
import { useDisciplines } from '@/hooks/use-disciplines';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

const PAGE_SIZE = 20;

type Filters = {
  disciplineId: string; // 'all' or uuid
  topicId: string; // 'all' or uuid
  diffMin: number;
  diffMax: number;
  search: string;
};

export default function BancoPage() {
  const { data: userData } = useUserData();
  const { data: disciplineData } = useDisciplines();
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  const [filters, setFilters] = useState<Filters>({
    disciplineId: 'all',
    topicId: 'all',
    diffMin: 1,
    diffMax: 5,
    search: '',
  });

  const topicsForDiscipline = useMemo(() => {
    if (!disciplineData) return [];
    if (filters.disciplineId === 'all') return [];
    return disciplineData.topicsByDiscipline.get(filters.disciplineId) ?? [];
  }, [disciplineData, filters.disciplineId]);

  const disciplineById = useMemo(() => {
    const m = new Map<string, { name: string; short_name: string | null; cor_hex: string | null }>();
    for (const d of disciplineData?.disciplines ?? []) {
      m.set(d.id, { name: d.name, short_name: d.short_name, cor_hex: d.cor_hex });
    }
    return m;
  }, [disciplineData]);

  const userId = userData?.user.id;

  const listQuery = useInfiniteQuery({
    queryKey: ['questions', userId, filters],
    enabled: Boolean(userId),
    initialPageParam: 0,
    placeholderData: keepPreviousData,
    queryFn: async ({ pageParam = 0 }) => {
      let builder = supabase
        .from('questions')
        .select(
          'id, tema, dificuldade, banca_estilo, enunciado, gabarito, discipline_id, topic_id, created_at, visibility, origem, quality_score, total_feedback_negative',
          { count: 'exact' },
        )
        .eq('user_id', userId!)
        .is('deleted_at', null)
        .gte('dificuldade', filters.diffMin)
        .lte('dificuldade', filters.diffMax)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);

      if (filters.disciplineId !== 'all') {
        builder = builder.eq('discipline_id', filters.disciplineId);
      }
      if (filters.topicId !== 'all') {
        builder = builder.eq('topic_id', filters.topicId);
      }
      if (filters.search.trim().length > 0) {
        builder = builder.ilike('enunciado', `%${filters.search.trim()}%`);
      }

      const { data, error, count } = await builder;
      if (error) throw error;
      const rows = data ?? [];
      const nextPage =
        rows.length < PAGE_SIZE ? null : pageParam + PAGE_SIZE;
      return { rows, nextPage, total: count ?? 0 };
    },
    getNextPageParam: (last) => last.nextPage,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('questions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast.success('Questão excluída');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const visibilityMutation = useMutation({
    mutationFn: async ({ id, visibility }: { id: string; visibility: string }) => {
      const { error } = await supabase
        .from('questions')
        .update({ visibility })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast.success('Visibilidade atualizada');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Soft-delete em massa, respeitando o filtro atual.
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkConfirmed, setBulkConfirmed] = useState(false);
  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Sem usuário');
      let builder = supabase
        .from('questions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('deleted_at', null)
        .gte('dificuldade', filters.diffMin)
        .lte('dificuldade', filters.diffMax);
      if (filters.disciplineId !== 'all') {
        builder = builder.eq('discipline_id', filters.disciplineId);
      }
      if (filters.topicId !== 'all') {
        builder = builder.eq('topic_id', filters.topicId);
      }
      if (filters.search.trim().length > 0) {
        builder = builder.ilike('enunciado', `%${filters.search.trim()}%`);
      }
      const { error } = await builder;
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast.success('Questões do filtro excluídas');
      setBulkDialogOpen(false);
      setBulkConfirmed(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rows = listQuery.data?.pages.flatMap((p) => p.rows) ?? [];
  const total = listQuery.data?.pages[0]?.total ?? 0;

  return (
    <main className="space-y-6 p-4 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Banco de questões</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {total} {total === 1 ? 'questão' : 'questões'} no filtro atual
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setBulkDialogOpen(true)}
            disabled={total === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" aria-hidden />
            Excluir todas ({total})
          </Button>
          <Link href="/banco/importar" className={buttonVariants()}>
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            Importar
          </Link>
        </div>
      </div>

      <Dialog
        open={bulkDialogOpen}
        onOpenChange={(open) => {
          setBulkDialogOpen(open);
          if (!open) setBulkConfirmed(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir todas as questões do filtro</DialogTitle>
            <DialogDescription>
              Vai apagar (soft-delete) <strong>{total}</strong>{' '}
              {total === 1 ? 'questão' : 'questões'} que batem com os filtros atuais.
              Tentativas e reviews FSRS associadas continuam no banco mas órfãs.
              Operação irreversível pela UI — só dá pra recuperar via SQL no Supabase.
            </DialogDescription>
          </DialogHeader>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={bulkConfirmed}
              onCheckedChange={(v) => setBulkConfirmed(Boolean(v))}
            />
            Entendi, pode apagar.
          </label>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={!bulkConfirmed || bulkDeleteMutation.isPending || total === 0}
              onClick={() => bulkDeleteMutation.mutate()}
            >
              {bulkDeleteMutation.isPending
                ? 'Apagando…'
                : `Apagar ${total} ${total === 1 ? 'questão' : 'questões'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="grid gap-4 pt-6 md:grid-cols-5">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="search">Buscar</Label>
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" aria-hidden />
              <Input
                id="search"
                placeholder="texto no enunciado…"
                className="pl-9"
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Disciplina</Label>
            <Select
              value={filters.disciplineId}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, disciplineId: v ?? 'all', topicId: 'all' }))
              }
            >
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
            <Label>Tema</Label>
            <Select
              value={filters.topicId}
              onValueChange={(v) => setFilters((f) => ({ ...f, topicId: v ?? 'all' }))}
              disabled={filters.disciplineId === 'all' || topicsForDiscipline.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {topicsForDiscipline.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="diffMin">Dif. mín.</Label>
              <Input
                id="diffMin"
                type="number"
                min={1}
                max={5}
                value={filters.diffMin}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, diffMin: Number(e.target.value) || 1 }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="diffMax">Dif. máx.</Label>
              <Input
                id="diffMax"
                type="number"
                min={1}
                max={5}
                value={filters.diffMax}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, diffMax: Number(e.target.value) || 5 }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {listQuery.isLoading && <p className="text-muted-foreground text-sm">Carregando…</p>}

        {!listQuery.isLoading && rows.length === 0 && (
          <Card>
            <CardContent className="text-muted-foreground py-10 text-center text-sm">
              Nenhuma questão neste filtro. Que tal{' '}
              <Link href="/banco/importar" className="underline underline-offset-2">
                importar um lote
              </Link>
              ?
            </CardContent>
          </Card>
        )}

        {rows.map((q) => {
          const disc = disciplineById.get(q.discipline_id);
          return (
            <Card key={q.id}>
              <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge
                      variant="outline"
                      style={disc?.cor_hex ? { borderColor: `${disc.cor_hex}66` } : undefined}
                    >
                      {disc?.short_name ?? disc?.name ?? '—'}
                    </Badge>
                    {q.tema && <span className="text-muted-foreground">{q.tema}</span>}
                    <Badge variant="outline">Dif. {q.dificuldade}</Badge>
                    {q.banca_estilo && <Badge variant="outline">{q.banca_estilo}</Badge>}
                    <Badge variant="outline">Gab. {q.gabarito}</Badge>
                    {q.visibility !== 'private' && (
                      <Badge variant="outline">{q.visibility}</Badge>
                    )}
                    {(q.total_feedback_negative ?? 0) > 0 && (
                      <Badge variant="outline" className="border-amber-500/60 text-amber-600 dark:text-amber-400">
                        ⚠ feedback
                      </Badge>
                    )}
                  </div>
                  <p className="line-clamp-3 text-sm">{q.enunciado}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-2 md:items-end">
                  <Select
                    value={q.visibility}
                    onValueChange={(v) =>
                      v && visibilityMutation.mutate({ id: q.id, visibility: v })
                    }
                    disabled={q.origem === 'forked' || visibilityMutation.isPending}
                  >
                    <SelectTrigger className="h-8 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Privada</SelectItem>
                      <SelectItem value="unlisted">Com link</SelectItem>
                      <SelectItem value="public">Pública</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(q.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {listQuery.hasNextPage && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => listQuery.fetchNextPage()}
              disabled={listQuery.isFetchingNextPage}
            >
              {listQuery.isFetchingNextPage ? 'Carregando…' : 'Carregar mais'}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
