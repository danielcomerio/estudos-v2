import Link from 'next/link';
import { AlertTriangle, Archive, UserCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const SECTIONS = [
  {
    href: '/configuracoes/perfil-publico',
    icon: UserCircle,
    title: 'Perfil público',
    desc: 'Handle, bio e visibilidade do seu perfil no /comunidade.',
  },
  {
    href: '/configuracoes/backups',
    icon: Archive,
    title: 'Backups',
    desc: 'Lista dos backups gerados quando você resetou dados.',
  },
  {
    href: '/configuracoes/reset-dados',
    icon: AlertTriangle,
    title: 'Resetar dados',
    desc: 'Apagar tudo (com backup automático antes). Operação irreversível.',
    danger: true,
  },
];

export default function ConfiguracoesPage() {
  return (
    <main className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href} className="block">
            <Card className="hover:border-ring/40 h-full transition-colors">
              <CardContent className="flex items-start gap-3 py-5">
                <s.icon
                  className={`mt-0.5 h-5 w-5 ${s.danger ? 'text-destructive' : 'text-muted-foreground'}`}
                  aria-hidden
                />
                <div>
                  <div className={`font-medium ${s.danger ? 'text-destructive' : ''}`}>
                    {s.title}
                  </div>
                  <div className="text-muted-foreground mt-0.5 text-sm">{s.desc}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
