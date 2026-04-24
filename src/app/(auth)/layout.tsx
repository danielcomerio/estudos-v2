export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-background flex min-h-full flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">estudos-v2</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Preparação MP-ES — Cientista de Dados
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}
