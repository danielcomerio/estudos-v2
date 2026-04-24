'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useUserData } from '@/hooks/use-user-data';
import { useDisciplines } from '@/hooks/use-disciplines';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

export default function DiscursivasListPage() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();
  const { data: userData } = useUserData();
  const { data: disciplineData } = useDisciplines();

  const [disciplineId, setDisciplineId] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkConfirmed, setBulkConfirmed] = useState(false);

  const disciplineById = useMemo(() => {
    const m = new Map<string, { name: string; short_name: string | null; cor_hex: string | null }>();
    for (const d of disciplineData?.disciplines ?? []) {
      m.set(d.id, { name: d.name, short_name: d.short_name, cor_hex: d.cor_hex });
    }
    return m;
  }, [disciplineData]);

  const userId = userData?.user.id;

  const listQuery = useQuery({
    queryKey: ['discursivas-list', userId, disciplineId, search],
    enabled: Boolean(userId),
    queryFn: async () => {
      let builder = supabase
        .from('discursives')
        .select('id, tema, dificuldade, banca_estilo, tipo_discursiva, discipline_id, created_at, max_linhas, pontuacao_maxima')
        .eq('user_id', userId!)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(100);
      if (disciplineId !== 'all') builder = builder.eq('discipline_id', disciplineId);
      if (search.trim().length > 0) builder = builder.ilike('enunciado_completo', `%${search.trim()}%`);
      const { data, error } = await builder;
      if (error) throw error;
      return data ?? [];
    },
  });

  const deleteOneMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('discursives')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['discursivas-list'] });
      toast.success('Discursiva excluída');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Sem usuário');
      let builder = supabase
        .from('discursives')
        .update({ deleted_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('deleted_at', null);
      if (disciplineId !== 'all') builder = builder.eq('discipline_id', disciplineId);
      if (search.trim().length > 0) {
        builder = builder.ilike('enunciado_completo', `%${search.trim()}%`);
      }
      const { error } = await builder;
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['discursivas-list'] });
      toast.success('Discursivas do filtro excluídas');
      setBulkDialogOpen(false);
      setBulkConfirmed(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rows = listQuery.data ?? [];
  const total = rows.length;

  return (
    <main className="space-y-6 p-4 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Discursivas</h1>
          <p className="text-muted-foreground mt-1 text-sm">{total} no filtro atual</p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setBulkDialogOpen(true)}
          disabled={total === 0}
        >
          <Trash2 className="mr-2 h-4 w-4" aria-hidden />
          Excluir todas ({total})
        </Button>
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
            <DialogTitle>Excluir todas as discursivas do filtro</DialogTitle>
            <DialogDescription>
              Vai apagar (soft-delete) <strong>{total}</strong>{' '}
              {total === 1 ? 'discursiva' : 'discursivas'} que batem com os filtros atuais.
              As tentativas (disc_attempts) ficam órfãs no banco. Operação irreversível pela UI.
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
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={!bulkConfirmed || bulkDeleteMutation.isPending || total === 0}
              onClick={() => bulkDeleteMutation.mutate()}
            >
              {bulkDeleteMutation.isPending
                ? 'Apagando…'
                : `Apagar ${total} ${total === 1 ? 'discursiva' : 'discursivas'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="grid gap-4 pt-6 md:grid-cols-3">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="search">Buscar</Label>
            <Input
              id="search"
              placeholder="texto no enunciado…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
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
        </CardContent>
      </Card>

      {listQuery.isLoading && <p className="text-muted-foreground text-sm">Carregando…</p>}
      {!listQuery.isLoading && rows.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma discursiva neste filtro. Importe pela tela de{' '}
            <Link href="/banco/importar" className="underline underline-offset-2">
              Importar
            </Link>
            .
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {rows.map((d) => {
          const disc = disciplineById.get(d.discipline_id);
          return (
            <Card key={d.id}>
              <CardContent className="flex items-center gap-3 py-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge
                      variant="outline"
                      style={disc?.cor_hex ? { borderColor: `${disc.cor_hex}66` } : undefined}
                    >
                      {disc?.short_name ?? disc?.name ?? '—'}
                    </Badge>
                    {d.tipo_discursiva && <Badge variant="outline">Tipo {d.tipo_discursiva}</Badge>}
                    <Badge variant="outline">Dif. {d.dificuldade}</Badge>
                    <Badge variant="outline">{d.max_linhas} linhas</Badge>
                    <Badge variant="outline">{d.pontuacao_maxima} pts</Badge>
                  </div>
                  <div className="truncate text-sm font-medium">{d.tema ?? '(sem tema)'}</div>
                </div>
                <Link
                  href={`/discursivas/${d.id}`}
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  Responder
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (
                      confirm(`Excluir "${d.tema ?? '(sem tema)'}"? Não dá pra desfazer pela UI.`)
                    ) {
                      deleteOneMutation.mutate(d.id);
                    }
                  }}
                  disabled={deleteOneMutation.isPending}
                  aria-label="Excluir discursiva"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
