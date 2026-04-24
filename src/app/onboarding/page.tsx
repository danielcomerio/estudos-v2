import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';
import { OnboardingForm } from '@/components/forms/onboarding-form';

export default async function OnboardingPage() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // If the user already has a study_profile, they don't belong here.
  const { data: existing } = await supabase
    .from('study_profiles')
    .select('id')
    .eq('user_id', user.id)
    .limit(1);
  if (existing && existing.length > 0) {
    redirect('/dashboard');
  }

  const { data: disciplines } = await supabase
    .from('disciplines')
    .select('id, slug, name, short_name, module')
    .order('ordem', { ascending: true });

  return <OnboardingForm disciplines={disciplines ?? []} />;
}
