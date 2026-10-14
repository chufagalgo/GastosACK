export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <div className="text-5xl" aria-hidden>
          💶
        </div>
        <h1 className="mt-2 font-heading text-2xl font-bold">GASTOSACK</h1>
        <p className="text-sm text-muted-foreground">Liquidació de despeses · ACK Logic</p>
      </div>
      {children}
    </main>
  );
}
