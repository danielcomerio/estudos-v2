import { notFound, redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';
import { SimuladoRunner } from '@/components/simulado/simulado-runner';

export default async function SimuladoRunPage({
  params,
}: {
  params: Promise<{ simuladoId: string }>;
}) {
  const { simuladoId } = await params;
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: simulado } = await supabase
    .from('simulados')
    .select('*')
    .eq('id', simuladoId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!simulado) notFound();

  return <SimuladoRunner simulado={simulado} userId={user.id} />;
}
