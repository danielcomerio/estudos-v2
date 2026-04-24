import { NextResponse } from 'next/server';
import { getSupabaseServer, getSupabaseServiceRole } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const BACKUP_BUCKET = 'backups';

export async function GET() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
  }

  const admin = getSupabaseServiceRole();
  const { data: files, error } = await admin.storage
    .from(BACKUP_BUCKET)
    .list(user.id, { sortBy: { column: 'created_at', order: 'desc' } });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const enriched = await Promise.all(
    (files ?? [])
      .filter((f) => f.name.endsWith('.json'))
      .map(async (f) => {
        const path = `${user.id}/${f.name}`;
        const { data: signed } = await admin.storage
          .from(BACKUP_BUCKET)
          .createSignedUrl(path, 60 * 60 * 24); // 24h
        return {
          name: f.name,
          path,
          size: f.metadata?.size as number | undefined,
          created_at: f.created_at ?? null,
          download_url: signed?.signedUrl ?? null,
        };
      }),
  );

  return NextResponse.json({ files: enriched });
}
