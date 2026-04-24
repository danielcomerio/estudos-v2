import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const ParamsSchema = z.object({ id: z.string().uuid() });

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolved = await params;
  const parsed = ParamsSchema.safeParse(resolved);
  if (!parsed.success) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 });
  }

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
  }

  const { data, error } = await supabase.rpc('fork_question', {
    p_question_id: parsed.data.id,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ new_id: data });
}
