'use client';

import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase/client';

/**
 * Disciplines + topics. Cached aggressively (5 min) because the canonical
 * list rarely changes — new topics only get added when the user imports
 * questions with a novel `tema`.
 */
export function useDisciplines() {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['disciplines-with-topics'],
    queryFn: async () => {
      const [discRes, topicsRes] = await Promise.all([
        supabase.from('disciplines').select('*').order('ordem', { ascending: true }),
        supabase.from('topics').select('*').order('ordem', { ascending: true }),
      ]);

      if (discRes.error) throw discRes.error;
      if (topicsRes.error) throw topicsRes.error;

      const disciplines = discRes.data ?? [];
      const topics = topicsRes.data ?? [];

      const topicsByDiscipline = new Map<string, typeof topics>();
      for (const t of topics) {
        const list = topicsByDiscipline.get(t.discipline_id) ?? [];
        list.push(t);
        topicsByDiscipline.set(t.discipline_id, list);
      }

      return {
        disciplines,
        topics,
        topicsByDiscipline,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
