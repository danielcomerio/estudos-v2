'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const SignupSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  display_name: z.string().trim().min(2, 'Nome muito curto').max(60),
});

type SignupForm = z.infer<typeof SignupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  const form = useForm<SignupForm>({
    resolver: zodResolver(SignupSchema),
    defaultValues: { email: '', password: '', display_name: '' },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: SignupForm) => {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { display_name: data.display_name },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      return signUpData;
    },
    onSuccess: async (data) => {
      // If email confirmation is off, Supabase returns a session immediately.
      if (data.session) {
        await queryClient.invalidateQueries({ queryKey: ['user-data'] });
        router.push('/onboarding');
        router.refresh();
      } else {
        toast.success('Conta criada — confirme seu email antes de entrar');
        router.push('/login');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Falha ao criar conta');
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar conta</CardTitle>
        <CardDescription>Comece sua preparação para o MP-ES.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((data) => signupMutation.mutate(data))}
        >
          <div className="space-y-2">
            <Label htmlFor="display_name">Nome</Label>
            <Input id="display_name" type="text" autoComplete="name" {...form.register('display_name')} />
            {form.formState.errors.display_name && (
              <p className="text-destructive text-xs">{form.formState.errors.display_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
            {form.formState.errors.email && (
              <p className="text-destructive text-xs">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...form.register('password')}
            />
            {form.formState.errors.password && (
              <p className="text-destructive text-xs">{form.formState.errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={signupMutation.isPending}>
            {signupMutation.isPending ? 'Criando conta…' : 'Criar conta'}
          </Button>
        </form>

        <p className="text-muted-foreground mt-4 text-center text-sm">
          Já tem conta?{' '}
          <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
            Entrar
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
