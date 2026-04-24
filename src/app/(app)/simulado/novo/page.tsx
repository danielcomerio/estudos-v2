'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useUserData } from '@/hooks/use-user-data';
import { useDisciplines } from '@/hooks/use-disciplines';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Preset "Oficial MP-ES" cotas by slug → count.
const OFICIAL_MP_ES: Record<string, number> = {
  portugues: 10,
  legislacao_mp: 5,
  estatistica: 15,
  banco_de_dados: 15,
  inteligencia_artificial: 15,
};

type Criterio = 'random' | 'quality_score' | 'fsrs_due';

export default function NovoTemplatePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();
  const { data: userData } = useUserData();
  const { data: disciplineData } = useDisciplines();

  const userId = userData?.user.id;
  const studyProfileId = userData?.activeStudyProfile?.id ?? null;
  const disciplines = disciplineData?.disciplines ?? [];

  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tempoMinutos, setTempoMinutos] = useState(240);
  const [numDiscursivas, setNumDiscursivas] = useState(0);
  const [difMin, setDifMin] = useState(1);
  const [difMax, setDifMax] = useState(5);
  const [criterio, setCriterio] = useState<Criterio>('random');
  const [isDefault, setIsDefault] = useState(false);
  const [cotas, setCotas] = useState<Record<string, number>>({});

  const totalCotas = useMemo(
    () => Object.values(cotas).reduce((a, b) => a + (Number(b) || 0), 0),
    [cotas],
  );

  function applyPreset() {
    const next: Record<string, number> = {};
    for (const d of disciplines) {
      next[d.id] = OFICIAL_MP_ES[d.slug] ?? 0;
    }
    setCotas(next);
    setNome((n) => n || 'Oficial MP-ES');
    setTempoMinutos(240);
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !studyProfileId) throw new Error('Sem perfil ativo');
      if (totalCotas === 0) throw new Error('Defina pelo menos uma cota > 0');
      if (difMin > difMax) throw new Error('Dificuldade mínima > máxima');

      const { data, error } = await supabase
        .from('simulado_templates')
        .insert({
          user_id: userId,
          study_profile_id: studyProfileId,
          nome: nome.trim() || 'Template sem nome',
          descricao: descricao.trim() || null,
          num_questoes_objetivas: totalCotas,
          num_discursivas: numDiscursivas,
          tempo_minutos: tempoMinutos,
          cotas,
          dificuldade_min: difMin,
          dificuldade_max: difMax,
          criterio_selecao: criterio,
          is_default: isDefault,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['simulado_templates', userId] });
      toast.success('Template criado');
      router.push('/simulado');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Novo template</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Salve um preset e rode simulados em 1 clique depois.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Identificação</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              rows={2}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
          <div>
            <Button variant="outline" onClick={applyPreset} type="button">
              Aplicar preset &quot;Oficial MP-ES&quot;
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Execução</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="tempo">Tempo total (min)</Label>
            <Input
              id="tempo"
              type="number"
              min={1}
              value={tempoMinutos}
              onChange={(e) => setTempoMinutos(Math.max(1, Number(e.target.value) || 60))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="discursivas">Discursivas</Label>
            <Input
              id="discursivas"
              type="number"
              min={0}
              value={numDiscursivas}
              onChange={(e) => setNumDiscursivas(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>
          <div className="space-y-2">
            <Label>Critério de seleção</Label>
            <Select value={criterio} onValueChange={(v) => setCriterio((v ?? 'random') as Criterio)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="random">Aleatório</SelectItem>
                <SelectItem value="quality_score">Quality score (melhores primeiro)</SelectItem>
                <SelectItem value="fsrs_due">FSRS due</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="difmin">Dif. mínima</Label>
            <Input
              id="difmin"
              type="number"
              min={1}
              max={5}
              value={difMin}
              onChange={(e) => setDifMin(Math.min(5, Math.max(1, Number(e.target.value) || 1)))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="difmax">Dif. máxima</Label>
            <Input
              id="difmax"
              type="number"
              min={1}
              max={5}
              value={difMax}
              onChange={(e) => setDifMax(Math.min(5, Math.max(1, Number(e.target.value) || 5)))}
            />
          </div>
          <label className="flex items-end gap-2 text-sm">
            <Checkbox checked={isDefault} onCheckedChange={(v) => setIsDefault(Boolean(v))} />
            Default
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cotas por disciplina</CardTitle>
          <CardDescription>
            Quantas questões objetivas cada disciplina contribui. Total atual:{' '}
            <span className="text-foreground font-medium">{totalCotas}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {disciplines.map((d) => (
            <div key={d.id} className="grid grid-cols-[1fr_6rem] items-center gap-3">
              <Label htmlFor={`cota-${d.id}`}>{d.short_name ?? d.name}</Label>
              <Input
                id={`cota-${d.id}`}
                type="number"
                min={0}
                value={cotas[d.id] ?? 0}
                onChange={(e) =>
                  setCotas((prev) => ({
                    ...prev,
                    [d.id]: Math.max(0, Number(e.target.value) || 0),
                  }))
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push('/simulado')}>
          Cancelar
        </Button>
        <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Criando…' : 'Criar template'}
        </Button>
      </div>
    </main>
  );
}
