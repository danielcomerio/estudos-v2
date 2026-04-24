import { AppNav } from './app-nav';
import { UserMenu } from './user-menu';

type Props = {
  email: string | null;
  displayName: string | null;
  children: React.ReactNode;
};

export function AppShell({ email, displayName, children }: Props) {
  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <aside className="bg-muted/30 md:border-border border-b md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <div className="flex h-14 items-center justify-between px-4 md:border-border/50 md:border-b">
          <span className="font-semibold tracking-tight">estudos-v2</span>
          <div className="md:hidden">
            <UserMenu email={email} displayName={displayName} />
          </div>
        </div>
        <AppNav />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border/50 hidden h-14 items-center justify-end border-b px-4 md:flex">
          <UserMenu email={email} displayName={displayName} />
        </header>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
