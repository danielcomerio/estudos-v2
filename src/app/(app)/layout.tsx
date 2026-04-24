import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';
import { AppShell } from '@/components/layout/app-shell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Require at least one study_profile before entering the app.
  const { data: studyProfiles } = await supabase
    .from('study_profiles')
    .select('id')
    .eq('user_id', user.id)
    .limit(1);

  if (!studyProfiles || studyProfiles.length === 0) {
    redirect('/onboarding');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, email')
    .eq('id', user.id)
    .maybeSingle();

  return (
    <AppShell
      email={profile?.email ?? user.email ?? null}
      displayName={profile?.display_name ?? null}
    >
      {children}
    </AppShell>
  );
}
