import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { FeedbackBodySchema } from '@/lib/validators/feedback';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = FeedbackBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'payload inválido', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { question_id, target, vote, motivo, comentario, also_delete } = parsed.data;

  // Upsert — one feedback per (user, question, target); re-voting updates.
  const { error: upsertErr } = await supabase.from('question_feedback').upsert(
    {
      user_id: user.id,
      question_id,
      target,
      vote,
      motivo: motivo ?? null,
      comentario: comentario ?? null,
    },
    { onConflict: 'user_id,question_id,target' },
  );
  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  let deleted = false;
  if (also_delete && vote === -1) {
    const { error: delErr } = await supabase
      .from('questions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', question_id)
      .eq('user_id', user.id); // RLS also enforces ownership
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }
    deleted = true;
  }

  return NextResponse.json({ ok: true, deleted });
}
