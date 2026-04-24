import { notFound, redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';
import { SessionRunner } from '@/components/praticar/session-runner';
import type { StudySessionConfig } from '@/types';

export default async function PraticarSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: session } = await supabase
    .from('study_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!session) notFound();

  return (
    <SessionRunner
      session={{
        id: session.id,
        modo: session.modo,
        num_questoes_alvo: session.num_questoes_alvo ?? 10,
        finalizada: session.finalizada,
        study_profile_id: session.study_profile_id,
        config: (session.config ?? {}) as StudySessionConfig,
      }}
    />
  );
}
