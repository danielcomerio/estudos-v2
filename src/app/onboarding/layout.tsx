export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-muted/20 min-h-full p-4 md:p-8">
      <div className="mx-auto w-full max-w-2xl space-y-6">{children}</div>
    </main>
  );
}
