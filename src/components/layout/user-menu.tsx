'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LogOut, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Props = {
  email: string | null;
  displayName: string | null;
};

export function UserMenu({ email, displayName }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.clear();
      router.push('/login');
      router.refresh();
    },
    onError: (error: Error) => toast.error(error.message || 'Erro ao sair'),
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="hover:bg-accent focus-visible:ring-ring inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium outline-none focus-visible:ring-2">
        <UserIcon className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">{displayName ?? email ?? 'Conta'}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{displayName ?? 'Conta'}</span>
            {email && (
              <span className="text-muted-foreground truncate text-xs">{email}</span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="mr-2 h-4 w-4" aria-hidden />
          {logoutMutation.isPending ? 'Saindo…' : 'Sair'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
