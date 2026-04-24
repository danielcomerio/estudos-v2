import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';

export const revalidate = 60; // seconds

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const supabase = await getSupabaseServer();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, handle, display_name, bio, is_public_profile, created_at')
    .eq('handle', handle)
    .eq('is_public_profile', true)
    .maybeSingle();

  if (!profile) notFound();

  const { data: questions } = await supabase
    .from('public_questions_feed')
    .select('id, tema, dificuldade, banca_estilo, enunciado, quality_score, discipline_id')
    .eq('author_handle', handle)
    .order('quality_score', { ascending: false })
    .limit(30);

  const { data: disciplines } = await supabase
    .from('disciplines')
    .select('id, short_name, name, cor_hex');
  const discById = new Map((disciplines ?? []).map((d) => [d.id, d]));

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {profile.display_name ?? `@${profile.handle}`}
        </h1>
        {profile.handle && (
          <p className="text-muted-foreground text-sm">@{profile.handle}</p>
        )}
      </div>

      {profile.bio && (
        <Card>
          <CardContent className="pt-6 text-sm leading-relaxed whitespace-pre-wrap">
            {profile.bio}
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
          Questões públicas ({(questions ?? []).length})
        </h2>

        {(!questions || questions.length === 0) && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma questão pública ainda.
            </CardContent>
          </Card>
        )}

        {(questions ?? []).map((q) => {
          const disc = q.discipline_id ? discById.get(q.discipline_id) : null;
          return (
            <Card key={q.id ?? ''}>
              <CardContent className="space-y-2 py-4">
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
                </div>
                <p className="line-clamp-3 text-sm">{q.enunciado}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <div className="pt-4">
        <Link href="/comunidade" className={buttonVariants({ variant: 'outline' })}>
          ← ver feed completo
        </Link>
      </div>
    </main>
  );
}
