import { NextResponse } from 'next/server';
import { getSupabaseServer, getSupabaseServiceRole } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const BACKUP_BUCKET = 'backups';
// Tables whose rows we copy into the backup AND then delete.
// (profiles, study_profiles and study_profile_disciplines are preserved so
// the user keeps their concurso config after reset.)
const TABLES_TO_RESET = [
  'question_feedback',
  'question_comments',
  'attempts',
  'disc_attempts',
  'reviews',
  'study_sessions',
  'simulados',
  'simulado_templates',
  'questions',
  'discursives',
] as const;

export async function POST() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
  }

  // Use the service-role client for backup + delete so RLS is bypassed;
  // we STILL scope every operation to user_id = <the authed user>.
  const admin = getSupabaseServiceRole();

  const snapshot: Record<string, unknown[]> = {};
  for (const table of TABLES_TO_RESET) {
    const { data, error } = await admin.from(table).select('*').eq('user_id', user.id);
    if (error) {
      return NextResponse.json(
        { error: `falha ao ler ${table}: ${error.message}` },
        { status: 500 },
      );
    }
    snapshot[table] = data ?? [];
  }

  const backup = {
    version: 1,
    user_id: user.id,
    generated_at: new Date().toISOString(),
    tables: snapshot,
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const path = `${user.id}/backup_${timestamp}.json`;
  const body = JSON.stringify(backup, null, 2);

  const { error: upErr } = await admin.storage
    .from(BACKUP_BUCKET)
    .upload(path, body, { contentType: 'application/json', upsert: false });
  if (upErr) {
    return NextResponse.json(
      { error: `falha ao salvar backup: ${upErr.message}` },
      { status: 500 },
    );
  }

  const { data: signed, error: signErr } = await admin.storage
    .from(BACKUP_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 days
  if (signErr || !signed) {
    return NextResponse.json(
      { error: `falha ao assinar URL: ${signErr?.message ?? '(sem URL)'}` },
      { status: 500 },
    );
  }

  // Only AFTER the backup is safely stored do we delete.
  for (const table of TABLES_TO_RESET) {
    const { error: delErr } = await admin.from(table).delete().eq('user_id', user.id);
    if (delErr) {
      return NextResponse.json(
        {
          error: `falha ao apagar ${table}: ${delErr.message}`,
          backup_url: signed.signedUrl,
          backup_path: path,
        },
        { status: 500 },
      );
    }
  }

  const totalRows = Object.values(snapshot).reduce((acc, rows) => acc + rows.length, 0);

  return NextResponse.json({
    ok: true,
    backup_url: signed.signedUrl,
    backup_path: path,
    backup_size: body.length,
    total_rows_backed_up: totalRows,
  });
}
