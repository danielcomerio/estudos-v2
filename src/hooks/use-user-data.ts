'use client';

import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase/client';

/**
 * Single source of truth for the current user's session + profile
 * + study_profiles. Uses the singleton browser client, so calling
 * this hook from N components does NOT create N Supabase clients.
 */
export function useUserData() {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['user-data'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('not authenticated');

      const [profileRes, studyProfilesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase
          .from('study_profiles')
          .select('*')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: true }),
      ]);

      if (profileRes.error) throw profileRes.error;
      if (studyProfilesRes.error) throw studyProfilesRes.error;

      const studyProfiles = studyProfilesRes.data ?? [];
      const activeStudyProfile =
        studyProfiles.find((p) => p.is_active && p.is_default) ??
        studyProfiles.find((p) => p.is_default) ??
        studyProfiles.find((p) => p.is_active) ??
        studyProfiles[0] ??
        null;

      return {
        user,
        profile: profileRes.data,
        studyProfiles,
        activeStudyProfile,
      };
    },
    staleTime: 60 * 1000,
  });
}
