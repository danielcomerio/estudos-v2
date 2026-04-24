'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Discipline = {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  module: string | null;
};

// Default "Oficial MP-ES" cotas: 60 objetivas total in 4h.
const DEFAULT_COTAS: Record<string, { num_questoes: number; pontos_por_questao: number }> = {
  portugues: { num_questoes: 10, pontos_por_questao: 1 },
  legislacao_mp: { num_questoes: 5, pontos_por_questao: 1 },
  estatistica: { num_questoes: 15, pontos_por_questao: 1 },
  banco_de_dados: { num_questoes: 15, pontos_por_questao: 1 },
  inteligencia_artificial: { num_questoes: 15, pontos_por_questao: 1 },
};

const OnboardingSchema = z.object({
  nome: z.string().trim().min(1, 'Informe um nome').max(80),
  nome_concurso: z.string().trim().max(120).optional(),
  orgao: z.string().trim().max(120).optional(),
  cargo: z.string().trim().max(120).optional(),
  banca: z.string().trim().max(60).optional(),
  data_prova: z.string().optional(),
  disciplines: z
    .array(
      z.object({
        discipline_id: z.string().uuid(),
        slug: z.string(),
        selected: z.boolean(),
        num_questoes: z.coerce.number().int().min(0).max(500).optional(),
        pontos_por_questao: z.coerce.number().min(0).max(100).optional(),
      }),
    )
    .min(1)
    .refine((d) => d.some((x) => x.selected), 'Selecione ao menos uma disciplina'),
});

type OnboardingInput = z.input<typeof OnboardingSchema>;
type OnboardingOutput = z.output<typeof OnboardingSchema>;

export function OnboardingForm({ disciplines }: { disciplines: Discipline[] }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  // Three-generic useForm so z.coerce.number() (input: unknown, output: number)
  // lines up both for defaultValues and for handleSubmit.
  const form = useForm<OnboardingInput, unknown, OnboardingOutput>({
    resolver: zodResolver(OnboardingSchema),
    defaultValues: {
      nome: 'MP-ES 2026',
      nome_concurso: 'MP-ES — Cientista de Dados',
      orgao: 'Ministério Público do Espírito Santo',
      cargo: 'Cientista de Dados',
      banca: 'FGV',
      data_prova: '2026-05-31',
      disciplines: disciplines.map((d) => ({
        discipline_id: d.id,
        slug: d.slug,
        selected: true,
        num_questoes: DEFAULT_COTAS[d.slug]?.num_questoes ?? 0,
        pontos_por_questao: DEFAULT_COTAS[d.slug]?.pontos_por_questao ?? 1,
      })),
    },
  });

  const disciplineFields = form.watch('disciplines');

  const createMutation = useMutation({
    mutationFn: async (values: OnboardingOutput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data: profile, error: profileError } = await supabase
        .from('study_profiles')
        .insert({
          user_id: user.id,
          nome: values.nome,
          nome_concurso: values.nome_concurso || null,
          orgao: values.orgao || null,
          cargo: values.cargo || null,
          banca: values.banca || null,
          data_prova: values.data_prova || null,
          is_active: true,
          is_default: true,
        })
        .select('id')
        .single();
      if (profileError) throw profileError;

      const selectedDisciplines = values.disciplines.filter((d) => d.selected);
      if (selectedDisciplines.length > 0) {
        const { error: spdError } = await supabase.from('study_profile_disciplines').insert(
          selectedDisciplines.map((d) => ({
            study_profile_id: profile.id,
            discipline_id: d.discipline_id,
            num_questoes: d.num_questoes ?? null,
            pontos_por_questao: d.pontos_por_questao ?? null,
          })),
        );
        if (spdError) throw spdError;
      }

      return profile.id;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user-data'] });
      toast.success('Perfil criado — bora estudar');
      router.push('/dashboard');
      router.refresh();
    },
    onError: (error: Error) => toast.error(error.message || 'Falha ao criar perfil'),
  });

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Vamos configurar seu perfil</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Isso ajuda o app a calcular pontuação e montar simulados que batam com a prova.
        </p>
      </div>

      <form
        className="space-y-6"
        onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
      >
        <Card>
          <CardHeader>
            <CardTitle>Concurso</CardTitle>
            <CardDescription>Dados do edital que você vai prestar.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="nome">Apelido deste perfil</Label>
              <Input id="nome" {...form.register('nome')} />
              {form.formState.errors.nome && (
                <p className="text-destructive text-xs">{form.formState.errors.nome.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nome_concurso">Nome do concurso</Label>
              <Input id="nome_concurso" {...form.register('nome_concurso')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="banca">Banca</Label>
              <Input id="banca" {...form.register('banca')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgao">Órgão</Label>
              <Input id="orgao" {...form.register('orgao')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo</Label>
              <Input id="cargo" {...form.register('cargo')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_prova">Data da prova</Label>
              <Input id="data_prova" type="date" {...form.register('data_prova')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Disciplinas</CardTitle>
            <CardDescription>
              Marque as disciplinas do seu concurso e, para cada uma, quantas questões caem e
              quanto vale cada uma.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {disciplineFields.map((field, index) => (
              <div
                key={field.discipline_id}
                className="border-border/60 grid grid-cols-[auto_1fr_6rem_6rem] items-center gap-3 rounded-md border p-3"
              >
                <Checkbox
                  checked={field.selected}
                  onCheckedChange={(v) =>
                    form.setValue(`disciplines.${index}.selected`, Boolean(v), {
                      shouldDirty: true,
                    })
                  }
                  aria-label={`Selecionar ${disciplines[index]?.name}`}
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{disciplines[index]?.name}</div>
                  <div className="text-muted-foreground truncate text-xs">
                    {disciplines[index]?.module}
                  </div>
                </div>
                <Input
                  type="number"
                  min={0}
                  placeholder="nº Q."
                  aria-label="Número de questões"
                  {...form.register(`disciplines.${index}.num_questoes`)}
                  disabled={!field.selected}
                />
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  placeholder="pts/q"
                  aria-label="Pontos por questão"
                  {...form.register(`disciplines.${index}.pontos_por_questao`)}
                  disabled={!field.selected}
                />
              </div>
            ))}
            {form.formState.errors.disciplines && (
              <p className="text-destructive text-xs">
                {form.formState.errors.disciplines.message ??
                  form.formState.errors.disciplines.root?.message}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Criando…' : 'Criar perfil e entrar'}
          </Button>
        </div>
      </form>
    </>
  );
}
