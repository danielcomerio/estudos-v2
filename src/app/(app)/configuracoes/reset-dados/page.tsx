'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ResetResult = {
  ok: boolean;
  backup_url: string;
  backup_path: string;
  backup_size: number;
  total_rows_backed_up: number;
};

export default function ResetDadosPage() {
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<ResetResult | null>(null);
  const queryClient = useQueryClient();

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/reset', { method: 'POST' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      return (await res.json()) as ResetResult;
    },
    onSuccess: async (data) => {
      setResult(data);
      // Clear cached app data since everything was wiped.
      await queryClient.invalidateQueries();
      toast.success('Dados resetados — backup salvo');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (result) {
    return (
      <main className="mx-auto max-w-2xl space-y-6 p-4 md:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Backup salvo e dados resetados</h1>
        <Card>
          <CardContent className="space-y-2 pt-6 text-sm">
            <div>
              Linhas copiadas pro backup:{' '}
              <span className="font-semibold tabular-nums">{result.total_rows_backed_up}</span>
            </div>
            <div>
              Tamanho: <span className="tabular-nums">{(result.backup_size / 1024).toFixed(1)} KB</span>
            </div>
            <div className="truncate">
              Arquivo: <span className="font-mono text-xs">{result.backup_path}</span>
            </div>
            <a
              href={result.backup_url}
              download
              className="mt-2 inline-block text-sm underline underline-offset-2"
            >
              Baixar backup (link válido por 7 dias)
            </a>
            <p className="text-muted-foreground mt-2 text-xs">
              Seus dados de estudo foram apagados (questions, attempts, reviews, simulados, etc.).
              Seu perfil e seu study_profile foram preservados.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Resetar dados</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Apaga todas as suas questões, discursivas, tentativas, reviews FSRS, simulados e
          sessões. Preserva seu perfil e seu study_profile.
        </p>
      </div>

      <Card className="border-destructive/60">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" aria-hidden /> Zona de perigo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>
            Antes de apagar, o servidor monta um JSON com tudo que vai ser removido e salva em{' '}
            <span className="font-mono text-xs">backups/{'{seu_user_id}'}/backup_TIMESTAMP.json</span>
            . Você recebe uma URL assinada com validade de 7 dias (renovável em /configuracoes
            /backups).
          </p>
          <p>
            <strong>Isto é irreversível</strong>: as rows vão embora do banco. Só dá pra voltar
            atrás re-importando o JSON do backup via{' '}
            <span className="font-mono text-xs">/banco/importar</span>.
          </p>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={confirmed}
              onCheckedChange={(v) => setConfirmed(Boolean(v))}
            />
            Entendi. Faça o backup e apague meus dados.
          </label>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          variant="destructive"
          disabled={!confirmed || resetMutation.isPending}
          onClick={() => resetMutation.mutate()}
        >
          {resetMutation.isPending ? 'Processando…' : 'Resetar todos os meus dados'}
        </Button>
      </div>
    </main>
  );
}
