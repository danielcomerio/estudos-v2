'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { FileDown } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type BackupFile = {
  name: string;
  path: string;
  size?: number;
  created_at: string | null;
  download_url: string | null;
};

function formatSize(bytes: number | undefined): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function BackupsPage() {
  const q = useQuery({
    queryKey: ['backups'],
    queryFn: async () => {
      const res = await fetch('/api/admin/backups');
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      return (await res.json()) as { files: BackupFile[] };
    },
  });

  const files = q.data?.files ?? [];

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Backups</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Backups gerados automaticamente pelo fluxo de{' '}
          <Link href="/configuracoes/reset-dados" className="underline underline-offset-2">
            reset de dados
          </Link>
          . URLs de download são assinadas por 24h.
        </p>
      </div>

      {q.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {q.isError && (
        <p className="text-destructive text-sm">Erro: {(q.error as Error).message}</p>
      )}
      {!q.isLoading && files.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhum backup ainda.
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {files.map((f) => (
          <Card key={f.path}>
            <CardContent className="flex items-center justify-between py-3 text-sm">
              <div className="min-w-0 flex-1">
                <div className="truncate font-mono text-xs">{f.name}</div>
                <div className="text-muted-foreground text-xs">
                  {f.created_at ? new Date(f.created_at).toLocaleString('pt-BR') : ''}
                  {' · '}
                  {formatSize(f.size)}
                </div>
              </div>
              {f.download_url && (
                <a
                  href={f.download_url}
                  download
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  <FileDown className="mr-2 h-4 w-4" aria-hidden /> baixar
                </a>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
