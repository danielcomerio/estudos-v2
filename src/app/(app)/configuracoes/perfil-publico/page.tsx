'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useUserData } from '@/hooks/use-user-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const HANDLE_RE = /^[a-z0-9_]{3,30}$/;

export default function PerfilPublicoPage() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();
  const { data: userData } = useUserData();
  const profile = userData?.profile;

  const [isPublic, setIsPublic] = useState<boolean>(false);
  const [handle, setHandle] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');

  useEffect(() => {
    if (profile) {
      setIsPublic(Boolean(profile.is_public_profile));
      setHandle(profile.handle ?? '');
      setBio(profile.bio ?? '');
      setDisplayName(profile.display_name ?? '');
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error('perfil não carregado');
      if (isPublic && !HANDLE_RE.test(handle)) {
        throw new Error('handle inválido (3–30 chars, só letras/números/underscore minúsculos)');
      }
      const { error } = await supabase
        .from('profiles')
        .update({
          is_public_profile: isPublic,
          handle: handle.trim() || null,
          display_name: displayName.trim() || null,
          bio: bio.trim().slice(0, 500) || null,
        })
        .eq('id', profile.id);
      if (error) {
        // Unique violation on handle is very common here; surface it cleanly.
        if (error.code === '23505') {
          throw new Error('Esse handle já está em uso.');
        }
        throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user-data'] });
      toast.success('Perfil público salvo');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Perfil público</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Quando o perfil está público, suas questões públicas aparecem no feed
          <Link href="/comunidade" className="mx-1 underline underline-offset-2">
            /comunidade
          </Link>
          com seu handle.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurações</CardTitle>
          <CardDescription>
            Só precisa do handle quando o perfil está público.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={isPublic}
              onCheckedChange={(v) => setIsPublic(Boolean(v))}
            />
            Tornar meu perfil público
          </label>

          <div className="space-y-2">
            <Label htmlFor="handle">Handle</Label>
            <Input
              id="handle"
              placeholder="ex: joao_concurseiro"
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase())}
              disabled={!isPublic}
            />
            <p className="text-muted-foreground text-xs">
              3–30 caracteres, só letras minúsculas, números e underscore.
              {handle && isPublic && (
                <>
                  {' '}
                  URL:{' '}
                  <span className="font-mono">/u/{handle}</span>
                </>
              )}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="display_name">Nome exibido</Label>
            <Input
              id="display_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio (máx. 500 caracteres)</Label>
            <Textarea
              id="bio"
              rows={4}
              maxLength={500}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Um pouco sobre você, seu concurso, etc."
              disabled={!isPublic}
            />
            <p className="text-muted-foreground text-xs">{bio.length}/500</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Salvando…' : 'Salvar'}
        </Button>
      </div>
    </main>
  );
}
