'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Database,
  Dumbbell,
  RotateCcw,
  ClipboardList,
  PenLine,
  Users,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/banco', label: 'Banco', icon: Database },
  { href: '/praticar', label: 'Praticar', icon: Dumbbell },
  { href: '/revisar', label: 'Revisar', icon: RotateCcw },
  { href: '/simulado', label: 'Simulado', icon: ClipboardList },
  { href: '/discursivas', label: 'Discursivas', icon: PenLine },
  { href: '/comunidade', label: 'Comunidade', icon: Users },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegação principal" className="flex flex-col gap-1 p-2">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
