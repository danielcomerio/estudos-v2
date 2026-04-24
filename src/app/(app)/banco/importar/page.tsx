'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2, FileJson, Upload } from 'lucide-react';
import {
  ObjectiveQuestionSchema,
  DiscursiveQuestionSchema,
  normalizeQuestion,
  detectQuestionType,
} from '@/lib/validators/questions';
import { useUserData } from '@/hooks/use-user-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type FileState = {
  id: string;
  name: string;
  size: number;
  status: 'validating' | 'ok' | 'warn' | 'error';
  totalItems: number;
  objetivas: number;
  discursivas: number;
  errors: { index: number; erro: string }[];
  criticalError?: string;
  validItems: unknown[];
  importResult?: {
    obj: { inseridas: number; duplicadas: number; erros: number };
    disc: { inseridas: number; duplicadas: number; erros: number };
  };
};

type ImportResponse = {
  objetivas: { inseridas: number; duplicadas: number; erros: unknown[] };
  discursivas: { inseridas: number; duplicadas: number; erros: unknown[] };
};

function extractItems(parsed: unknown): unknown[] | null {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') {
    const o = parsed as Record<string, unknown>;
    if (Array.isArray(o.items)) return o.items;
    if (Array.isArray(o.questoes)) return o.questoes;
    if (Array.isArray(o.questions)) return o.questions;
  }
  return null;
}

function formatZodIssueMessage(issues: readonly { path: readonly PropertyKey[]; message: string }[]): string {
  return issues
    .map((i) => `${i.path.map(String).join('.') || '(raiz)'}: ${i.message}`)
    .join('; ');
}

async function validateFile(file: File): Promise<FileState> {
  const base: FileState = {
    id: `${file.name}-${file.size}-${file.lastModified}`,
    name: file.name,
    size: file.size,
    status: 'validating',
    totalItems: 0,
    objetivas: 0,
    discursivas: 0,
    errors: [],
    validItems: [],
  };

  let text: string;
  try {
    text = await file.text();
  } catch (err) {
    return { ...base, status: 'error', criticalError: `falha ao ler arquivo: ${String(err)}` };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return { ...base, status: 'error', criticalError: `JSON inválido: ${String(err)}` };
  }

  const items = extractItems(parsed);
  if (!items) {
    return {
      ...base,
      status: 'error',
      criticalError: 'estrutura não reconhecida (esperado array ou { items | questoes | questions })',
    };
  }

  const errors: { index: number; erro: string }[] = [];
  const validItems: unknown[] = [];
  let objetivas = 0;
  let discursivas = 0;

  items.forEach((raw, index) => {
    const normalized = normalizeQuestion(raw);
    const kind = detectQuestionType(normalized);
    const result =
      kind === 'objetiva'
        ? ObjectiveQuestionSchema.safeParse(normalized)
        : DiscursiveQuestionSchema.safeParse(normalized);
    if (!result.success) {
      errors.push({ index, erro: formatZodIssueMessage(result.error.issues) });
    } else {
      if (kind === 'objetiva') objetivas += 1;
      else discursivas += 1;
      validItems.push(raw); // send the ORIGINAL raw to the server; server normalizes again
    }
  });

  const status: FileState['status'] =
    items.length === 0 || validItems.length === 0
      ? 'error'
      : errors.length > 0
        ? 'warn'
        : 'ok';

  return {
    ...base,
    status,
    totalItems: items.length,
    objetivas,
    discursivas,
    errors,
    validItems,
  };
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function StatusBadge({ status }: { status: FileState['status'] }) {
  const label = {
    validating: 'Validando…',
    ok: 'OK',
    warn: 'Atenção',
    error: 'Erro',
  }[status];
  return (
    <Badge
      variant="outline"
      className={cn(
        status === 'ok' && 'border-emerald-500/60 text-emerald-600 dark:text-emerald-400',
        status === 'warn' && 'border-amber-500/60 text-amber-600 dark:text-amber-400',
        status === 'error' && 'border-red-500/60 text-red-600 dark:text-red-400',
      )}
    >
      {label}
    </Badge>
  );
}

export default function ImportarPage() {
  const { data: userData } = useUserData();
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<FileState[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const studyProfileId = userData?.activeStudyProfile?.id;

  const onFilesSelected = async (selected: FileList | null) => {
    if (!selected) return;
    const arr = Array.from(selected);
    // Insert placeholders while validating.
    const placeholders: FileState[] = arr.map((f) => ({
      id: `${f.name}-${f.size}-${f.lastModified}`,
      name: f.name,
      size: f.size,
      status: 'validating',
      totalItems: 0,
      objetivas: 0,
      discursivas: 0,
      errors: [],
      validItems: [],
    }));
    setFiles((prev) => [...prev, ...placeholders]);
    const results = await Promise.all(arr.map(validateFile));
    setFiles((prev) => {
      const next = [...prev];
      for (const r of results) {
        const idx = next.findIndex((f) => f.id === r.id);
        if (idx >= 0) next[idx] = r;
        else next.push(r);
      }
      return next;
    });
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!studyProfileId) throw new Error('Sem perfil de estudo ativo');
      const results: Record<string, FileState['importResult']> = {};
      for (const f of files) {
        if (f.status === 'error' || f.validItems.length === 0) continue;
        const res = await fetch('/api/questions/import', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ items: f.validItems, study_profile_id: studyProfileId }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const data: ImportResponse = await res.json();
        results[f.id] = {
          obj: {
            inseridas: data.objetivas.inseridas,
            duplicadas: data.objetivas.duplicadas,
            erros: data.objetivas.erros.length,
          },
          disc: {
            inseridas: data.discursivas.inseridas,
            duplicadas: data.discursivas.duplicadas,
            erros: data.discursivas.erros.length,
          },
        };
      }
      return results;
    },
    onSuccess: async (results) => {
      setFiles((prev) =>
        prev.map((f) => (results[f.id] ? { ...f, importResult: results[f.id] } : f)),
      );
      await queryClient.invalidateQueries({ queryKey: ['questions'] });
      const totalObj = Object.values(results).reduce((acc, r) => acc + (r?.obj.inseridas ?? 0), 0);
      const totalDisc = Object.values(results).reduce((acc, r) => acc + (r?.disc.inseridas ?? 0), 0);
      toast.success(`Importadas: ${totalObj} objetivas, ${totalDisc} discursivas`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const validFiles = files.filter((f) => f.status !== 'error' && f.validItems.length > 0);
  const totalValid = validFiles.reduce((acc, f) => acc + f.validItems.length, 0);

  return (
    <main className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Importar questões</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Suba um ou mais arquivos JSON. Cada arquivo é validado no navegador antes de ir pro servidor.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Arquivos</CardTitle>
          <CardDescription>Aceita array puro ou {'{ items | questoes | questions }'}.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="border-border hover:bg-accent/40 flex cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 text-sm transition-colors">
            <Upload className="h-4 w-4" aria-hidden />
            Selecionar arquivos JSON
            <input
              type="file"
              multiple
              accept=".json,application/json"
              className="sr-only"
              onChange={(e) => {
                onFilesSelected(e.target.files);
                e.target.value = '';
              }}
            />
          </label>

          {files.length > 0 && (
            <div className="border-border overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Arquivo</th>
                    <th className="px-3 py-2 text-left">Tamanho</th>
                    <th className="px-3 py-2 text-center">Status</th>
                    <th className="px-3 py-2 text-right">Obj.</th>
                    <th className="px-3 py-2 text-right">Disc.</th>
                    <th className="px-3 py-2 text-right">Erros</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {files.map((f) => {
                    const isExpanded = expanded === f.id;
                    return (
                      <tr key={f.id} className="border-border/60 border-t">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <FileJson className="text-muted-foreground h-4 w-4" aria-hidden />
                            <span className="truncate">{f.name}</span>
                          </div>
                          {f.criticalError && (
                            <p className="text-destructive mt-1 text-xs">{f.criticalError}</p>
                          )}
                          {f.importResult && (
                            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                              ✓ {f.importResult.obj.inseridas + f.importResult.disc.inseridas} inseridas
                              {f.importResult.obj.duplicadas + f.importResult.disc.duplicadas > 0 &&
                                `, ${f.importResult.obj.duplicadas + f.importResult.disc.duplicadas} duplicadas`}
                            </p>
                          )}
                        </td>
                        <td className="text-muted-foreground px-3 py-2">{formatSize(f.size)}</td>
                        <td className="px-3 py-2 text-center">
                          <StatusBadge status={f.status} />
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{f.objetivas}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{f.discursivas}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {f.errors.length || (f.criticalError ? '—' : 0)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {f.errors.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setExpanded(isExpanded ? null : f.id)}
                              className="text-xs underline underline-offset-2"
                            >
                              {isExpanded ? 'ocultar' : 'ver erros'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {expanded && (
            <div className="bg-muted/40 rounded-md p-3">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
                <AlertCircle className="text-amber-500 h-4 w-4" aria-hidden />
                Erros em {files.find((f) => f.id === expanded)?.name}
              </h3>
              <ul className="space-y-1 text-xs">
                {files
                  .find((f) => f.id === expanded)
                  ?.errors.map((e) => (
                    <li key={e.index} className="font-mono">
                      <span className="text-muted-foreground">#{e.index}</span> {e.erro}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between border-t pt-4">
            <div className="text-muted-foreground text-sm">
              {totalValid > 0 ? (
                <>
                  <CheckCircle2 className="mr-1 inline h-4 w-4 text-emerald-500" aria-hidden />
                  {totalValid} itens prontos para importar
                </>
              ) : (
                <>Nenhum item válido para importar ainda</>
              )}
            </div>
            <Button
              disabled={totalValid === 0 || !studyProfileId || importMutation.isPending}
              onClick={() => importMutation.mutate()}
            >
              {importMutation.isPending ? 'Importando…' : 'Importar válidas'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
