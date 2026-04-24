import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer } from '@/lib/supabase/server';
import {
  ImportBodySchema,
  ObjectiveQuestionSchema,
  DiscursiveQuestionSchema,
  normalizeQuestion,
  detectQuestionType,
  type ObjectiveQuestion,
  type DiscursiveQuestion,
} from '@/lib/validators/questions';
import { enunciadoHash } from '@/lib/hash';

export const runtime = 'nodejs';

type ImportError = { index: number; erro: string };

function formatZodError(err: z.ZodError): string {
  return err.issues
    .map((i) => `${i.path.join('.') || '(raiz)'}: ${i.message}`)
    .join('; ');
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

function resolveDisciplineId(
  raw: string,
  slugToId: Map<string, string>,
  idSet: Set<string>,
): string | null {
  if (idSet.has(raw)) return raw; // already a UUID we know
  const byExact = slugToId.get(raw);
  if (byExact) return byExact;
  const byLower = slugToId.get(raw.toLowerCase());
  return byLower ?? null;
}

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

  const parsedBody = ImportBodySchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: 'payload inválido', issues: parsedBody.error.issues },
      { status: 400 },
    );
  }
  const { items, study_profile_id } = parsedBody.data;

  // Verify ownership of the study_profile.
  const { data: studyProfile, error: spErr } = await supabase
    .from('study_profiles')
    .select('id, user_id')
    .eq('id', study_profile_id)
    .maybeSingle();
  if (spErr || !studyProfile || studyProfile.user_id !== user.id) {
    return NextResponse.json({ error: 'study_profile inválido' }, { status: 403 });
  }

  // Disciplines map (slug → UUID) so we can resolve whatever users write in JSON.
  const { data: disciplines, error: discErr } = await supabase
    .from('disciplines')
    .select('id, slug');
  if (discErr || !disciplines) {
    return NextResponse.json({ error: 'falha ao carregar disciplinas' }, { status: 500 });
  }
  const slugToId = new Map<string, string>();
  const idSet = new Set<string>();
  for (const d of disciplines) {
    slugToId.set(d.slug, d.id);
    idSet.add(d.id);
  }

  // ----- parse + validate each item into objective / discursive / error buckets -----
  type ParsedObjective = {
    index: number;
    q: ObjectiveQuestion;
    discipline_id: string;
    temaSlug: string;
  };
  type ParsedDiscursive = {
    index: number;
    q: DiscursiveQuestion;
    discipline_id: string;
    temaSlug: string;
  };

  const parsedObjectives: ParsedObjective[] = [];
  const parsedDiscursives: ParsedDiscursive[] = [];
  const objErrors: ImportError[] = [];
  const discErrors: ImportError[] = [];

  items.forEach((raw, index) => {
    const normalized = normalizeQuestion(raw);
    const kind = detectQuestionType(normalized);

    if (kind === 'objetiva') {
      const result = ObjectiveQuestionSchema.safeParse(normalized);
      if (!result.success) {
        objErrors.push({ index, erro: formatZodError(result.error) });
        return;
      }
      const disciplineId = resolveDisciplineId(result.data.disciplina_id, slugToId, idSet);
      if (!disciplineId) {
        objErrors.push({
          index,
          erro: `disciplina_id '${result.data.disciplina_id}' não encontrada`,
        });
        return;
      }
      parsedObjectives.push({
        index,
        q: result.data,
        discipline_id: disciplineId,
        temaSlug: slugify(result.data.tema),
      });
    } else {
      const result = DiscursiveQuestionSchema.safeParse(normalized);
      if (!result.success) {
        discErrors.push({ index, erro: formatZodError(result.error) });
        return;
      }
      const disciplineId = resolveDisciplineId(result.data.disciplina_id, slugToId, idSet);
      if (!disciplineId) {
        discErrors.push({
          index,
          erro: `disciplina_id '${result.data.disciplina_id}' não encontrada`,
        });
        return;
      }
      parsedDiscursives.push({
        index,
        q: result.data,
        discipline_id: disciplineId,
        temaSlug: slugify(result.data.tema),
      });
    }
  });

  // ----- ensure topics exist for every (discipline, temaSlug) we need -----
  const neededTopics = new Map<string, { discipline_id: string; slug: string; name: string }>();
  for (const p of [...parsedObjectives, ...parsedDiscursives]) {
    if (!p.temaSlug) continue;
    const key = `${p.discipline_id}::${p.temaSlug}`;
    if (!neededTopics.has(key)) {
      neededTopics.set(key, {
        discipline_id: p.discipline_id,
        slug: p.temaSlug,
        name: p.q.tema,
      });
    }
  }

  const topicKeyToId = new Map<string, string>();
  if (neededTopics.size > 0) {
    const rows = Array.from(neededTopics.values());
    const { data: upserted, error: topicsErr } = await supabase
      .from('topics')
      .upsert(rows, { onConflict: 'discipline_id,slug' })
      .select('id, discipline_id, slug');
    if (topicsErr) {
      return NextResponse.json(
        { error: 'falha ao criar topics', detail: topicsErr.message },
        { status: 500 },
      );
    }
    for (const t of upserted ?? []) {
      topicKeyToId.set(`${t.discipline_id}::${t.slug}`, t.id);
    }
  }

  // ----- dedupe objetivas by (user, enunciado_hash) among live rows -----
  const objWithHash = parsedObjectives.map((p) => ({
    ...p,
    hash: enunciadoHash(p.q.enunciado),
  }));

  let existingHashes: Set<string> = new Set();
  if (objWithHash.length > 0) {
    const { data: existing } = await supabase
      .from('questions')
      .select('enunciado_hash')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .in('enunciado_hash', objWithHash.map((o) => o.hash));
    existingHashes = new Set((existing ?? []).map((r) => r.enunciado_hash).filter(Boolean) as string[]);
  }

  const objDuplicates = objWithHash.filter((o) => existingHashes.has(o.hash));
  const objToInsert = objWithHash.filter((o) => !existingHashes.has(o.hash));

  // Objective rows for insert.
  let objInseridas = 0;
  if (objToInsert.length > 0) {
    const rows = objToInsert.map((o) => ({
      user_id: user.id,
      study_profile_id,
      discipline_id: o.discipline_id,
      topic_id: topicKeyToId.get(`${o.discipline_id}::${o.temaSlug}`) ?? null,
      tema: o.q.tema,
      dificuldade: o.q.dificuldade,
      banca_estilo: o.q.banca_estilo,
      enunciado: o.q.enunciado,
      enunciado_hash: o.hash,
      alternativas: o.q.alternativas,
      gabarito: o.q.gabarito,
      explicacao_geral: o.q.explicacao_geral,
      pegadinhas: o.q.pegadinhas,
      origem: 'import',
      origem_details: { imported_at: new Date().toISOString() },
    }));
    const { error: objInsErr, count } = await supabase
      .from('questions')
      .insert(rows, { count: 'exact' });
    if (objInsErr) {
      return NextResponse.json(
        { error: 'falha ao inserir questões', detail: objInsErr.message },
        { status: 500 },
      );
    }
    objInseridas = count ?? rows.length;
  }

  // Discursive rows for insert (no dedupe — we don't store a hash for them).
  let discInseridas = 0;
  if (parsedDiscursives.length > 0) {
    const rows = parsedDiscursives.map((p) => ({
      user_id: user.id,
      study_profile_id,
      discipline_id: p.discipline_id,
      topic_id: topicKeyToId.get(`${p.discipline_id}::${p.temaSlug}`) ?? null,
      tema: p.q.tema,
      dificuldade: p.q.dificuldade,
      banca_estilo: p.q.banca_estilo,
      tipo_discursiva: p.q.tipo_discursiva ?? null,
      enunciado_completo: p.q.enunciado_completo,
      texto_base: p.q.texto_base ?? null,
      comando: p.q.comando ?? null,
      quesitos: p.q.quesitos ?? null,
      rubrica: p.q.rubrica ?? null,
      espelho_resposta: p.q.espelho_resposta ?? null,
      conceitos_chave: p.q.conceitos_chave ?? null,
      pegadinhas_esperadas: p.q.pegadinhas_esperadas ?? null,
      estrategia_redacao: p.q.estrategia_redacao ?? null,
      observacoes_corretor: p.q.observacoes_corretor ?? null,
      apostas_relacionadas: p.q.apostas_relacionadas ?? null,
      max_linhas: p.q.max_linhas,
      pontuacao_maxima: p.q.pontuacao_maxima,
      origem: 'import',
      origem_details: { imported_at: new Date().toISOString() },
    }));
    const { error: discInsErr, count } = await supabase
      .from('discursives')
      .insert(rows, { count: 'exact' });
    if (discInsErr) {
      return NextResponse.json(
        { error: 'falha ao inserir discursivas', detail: discInsErr.message },
        { status: 500 },
      );
    }
    discInseridas = count ?? rows.length;
  }

  return NextResponse.json({
    objetivas: {
      inseridas: objInseridas,
      duplicadas: objDuplicates.length,
      erros: objErrors,
    },
    discursivas: {
      inseridas: discInseridas,
      duplicadas: 0,
      erros: discErrors,
    },
  });
}
