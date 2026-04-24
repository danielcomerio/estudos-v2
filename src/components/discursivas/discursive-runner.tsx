'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Button, buttonVariants } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { Discursive } from '@/types';

type Quesito = { numero: number; pergunta: string; pontos_max: number };
type RubricaItem = { criterio: string; pontos: number; detalhamento?: string };

function parseQuesitos(raw: unknown): Quesito[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
    .map((x) => ({
      numero: Number(x.numero ?? 0),
      pergunta: String(x.pergunta ?? ''),
      pontos_max: Number(x.pontos_max ?? 0),
    }));
}

function parseRubrica(raw: unknown): RubricaItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
    .map((x) => ({
      criterio: String(x.criterio ?? ''),
      pontos: Number(x.pontos ?? 0),
      detalhamento: x.detalhamento === undefined ? undefined : String(x.detalhamento),
    }));
}

export function DiscursiveRunner({
  discursive,
  userId,
}: {
  discursive: Discursive;
  userId: string;
}) {
  const supabase = getSupabaseClient();

  const quesitos = useMemo(() => parseQuesitos(discursive.quesitos), [discursive.quesitos]);
  const rubrica = useMemo(() => parseRubrica(discursive.rubrica), [discursive.rubrica]);
  const conceitos = discursive.conceitos_chave ?? [];

  const [phase, setPhase] = useState<'writing' | 'evaluating' | 'saved'>('writing');
  const [resposta, setResposta] = useState('');
  const [startedAt] = useState<number>(Date.now());
  const [rubricaScores, setRubricaScores] = useState<number[]>(() => rubrica.map(() => 0));
  const [conceitosCheck, setConceitosCheck] = useState<boolean[]>(() => conceitos.map(() => false));
  const [viuEspelho, setViuEspelho] = useState(false);

  const linhas = resposta.split(/\r?\n/).length;

  const pontuacaoFinal = useMemo(
    () => rubricaScores.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0),
    [rubricaScores],
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const auto_avaliacao = {
        rubrica: rubrica.map((r, i) => ({
          criterio: r.criterio,
          pontos_max: r.pontos,
          dados: rubricaScores[i] ?? 0,
        })),
        conceitos_chave_cobertos: conceitos.filter((_, i) => conceitosCheck[i]),
        linhas,
        viu_espelho: viuEspelho,
      };
      const { error } = await supabase.from('disc_attempts').insert({
        user_id: userId,
        discursive_id: discursive.id,
        resposta_texto: resposta,
        auto_avaliacao,
        pontuacao_final: pontuacaoFinal,
        viu_espelho: viuEspelho,
        tempo_gasto_ms: Date.now() - startedAt,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setPhase('saved');
      toast.success('Resposta registrada');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // --- WRITING PHASE ---
  if (phase === 'writing') {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-4 md:p-8">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="outline">Dif. {discursive.dificuldade}</Badge>
          {discursive.banca_estilo && <Badge variant="outline">{discursive.banca_estilo}</Badge>}
          {discursive.tipo_discursiva && (
            <Badge variant="outline">Tipo {discursive.tipo_discursiva}</Badge>
          )}
          <Badge variant="outline">até {discursive.max_linhas} linhas</Badge>
          <Badge variant="outline">{discursive.pontuacao_maxima} pts</Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Enunciado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {discursive.texto_base && (
              <section>
                <div className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                  Texto-base
                </div>
                <p className="leading-relaxed whitespace-pre-wrap">{discursive.texto_base}</p>
              </section>
            )}
            <section>
              <div className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                Comando
              </div>
              <p className="leading-relaxed whitespace-pre-wrap">
                {discursive.comando ?? discursive.enunciado_completo}
              </p>
            </section>
            {quesitos.length > 0 && (
              <section>
                <div className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                  Quesitos
                </div>
                <ol className="list-decimal space-y-1 pl-5">
                  {quesitos.map((q) => (
                    <li key={q.numero}>
                      {q.pergunta}{' '}
                      <span className="text-muted-foreground text-xs">
                        ({q.pontos_max} pts)
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sua resposta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Textarea
              rows={14}
              value={resposta}
              onChange={(e) => setResposta(e.target.value)}
              placeholder="Escreva sua resposta aqui…"
              className="font-mono text-sm"
            />
            <div className="text-muted-foreground text-xs tabular-nums">
              {linhas} linha{linhas === 1 ? '' : 's'} · limite recomendado{' '}
              {discursive.max_linhas}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Link href="/discursivas" className={buttonVariants({ variant: 'outline' })}>
            Voltar
          </Link>
          <Button
            onClick={() => setPhase('evaluating')}
            disabled={resposta.trim().length === 0}
          >
            Enviar e auto-avaliar
          </Button>
        </div>
      </main>
    );
  }

  // --- SAVED PHASE ---
  if (phase === 'saved') {
    return (
      <main className="mx-auto max-w-xl space-y-4 p-4 md:p-8">
        <h1 className="text-2xl font-semibold">Resposta salva</h1>
        <Card>
          <CardContent className="space-y-1 pt-6 text-sm">
            <div>
              Pontuação auto-atribuída:{' '}
              <span className="font-semibold">{pontuacaoFinal.toFixed(1)}</span> /{' '}
              {discursive.pontuacao_maxima}
            </div>
            <div>Linhas: {linhas}</div>
          </CardContent>
        </Card>
        <div className="flex gap-2">
          <Link href="/discursivas" className={buttonVariants()}>
            Outra discursiva
          </Link>
          <Link
            href="/dashboard"
            className={buttonVariants({ variant: 'outline' })}
          >
            Dashboard
          </Link>
        </div>
      </main>
    );
  }

  // --- EVALUATING PHASE ---
  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4 md:p-8">
      <h1 className="text-2xl font-semibold">Auto-avaliação</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sua resposta</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{resposta}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Espelho</span>
              {!viuEspelho && (
                <Button size="sm" variant="outline" onClick={() => setViuEspelho(true)}>
                  Revelar
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {viuEspelho ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {discursive.espelho_resposta ?? '(sem espelho registrado)'}
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                Clique em &quot;Revelar&quot; quando quiser ver a resposta-modelo.
                Responder sem espiar primeiro ajuda no feedback honesto.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {rubrica.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Rubrica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rubrica.map((r, i) => (
              <div key={i} className="grid grid-cols-[1fr_8rem] items-start gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="text-sm font-medium">{r.criterio}</div>
                  {r.detalhamento && (
                    <div className="text-muted-foreground text-xs">{r.detalhamento}</div>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">
                    pontos (0–{r.pontos})
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={r.pontos}
                    step={0.1}
                    value={rubricaScores[i] ?? 0}
                    onChange={(e) => {
                      const v = Math.min(r.pontos, Math.max(0, Number(e.target.value) || 0));
                      setRubricaScores((prev) => {
                        const next = [...prev];
                        next[i] = v;
                        return next;
                      });
                    }}
                  />
                </div>
              </div>
            ))}
            <div className="text-right text-sm font-medium">
              Total: {pontuacaoFinal.toFixed(1)} / {discursive.pontuacao_maxima}
            </div>
          </CardContent>
        </Card>
      )}

      {conceitos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Conceitos-chave</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {conceitos.map((c, i) => (
              <label key={i} className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={conceitosCheck[i] ?? false}
                  onCheckedChange={(v) =>
                    setConceitosCheck((prev) => {
                      const next = [...prev];
                      next[i] = Boolean(v);
                      return next;
                    })
                  }
                />
                <span className={conceitosCheck[i] ? '' : 'text-muted-foreground'}>{c}</span>
              </label>
            ))}
          </CardContent>
        </Card>
      )}

      {(discursive.estrategia_redacao ||
        discursive.pegadinhas_esperadas?.length ||
        discursive.observacoes_corretor) && (
        <Card>
          <CardHeader>
            <CardTitle>Notas da banca</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {discursive.estrategia_redacao && (
              <section>
                <div className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                  Estratégia
                </div>
                <p className="leading-relaxed">{discursive.estrategia_redacao}</p>
              </section>
            )}
            {Array.isArray(discursive.pegadinhas_esperadas) &&
              discursive.pegadinhas_esperadas.length > 0 && (
                <section>
                  <div className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                    Pegadinhas esperadas
                  </div>
                  <ul className="list-disc space-y-1 pl-5">
                    {discursive.pegadinhas_esperadas.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </section>
              )}
            {discursive.observacoes_corretor && (
              <section>
                <div className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                  Observações do corretor
                </div>
                <p className="leading-relaxed">{discursive.observacoes_corretor}</p>
              </section>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setPhase('writing')}>
          Voltar
        </Button>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Salvando…' : 'Salvar avaliação'}
        </Button>
      </div>
    </main>
  );
}
