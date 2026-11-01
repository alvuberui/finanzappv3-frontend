type LoadingSize = "sm" | "md";

export function LoadingDots({ size = "md" }: { size?: LoadingSize }) {
  return (
    <span className={`loading-dots loading-dots-${size}`} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export function InlineLoading({ label = "Cargando", size = "sm" }: { label?: string; size?: LoadingSize }) {
  return (
    <span className="inline-flex items-center gap-2 text-slate-400" role="status" aria-live="polite">
      <LoadingDots size={size} />
      <span>{label}</span>
    </span>
  );
}

export function LoadingScreen({ label = "Preparando tu espacio" }: { label?: string }) {
  return (
    <main className="loading-screen" role="status" aria-live="polite" aria-label={label}>
      <div className="loading-panel">
        <div className="loading-mark">F</div>
        <div className="mt-6">
          <p className="text-lg font-bold tracking-tight text-white">FinanzApp</p>
          <p className="mt-2 text-sm text-slate-400">{label}</p>
        </div>
        <div className="loading-progress" aria-hidden="true">
          <span />
        </div>
        <LoadingDots />
      </div>
    </main>
  );
}

export function ButtonLoading({ label = "Guardando" }: { label?: string }) {
  return (
    <span className="inline-flex items-center justify-center gap-2">
      <LoadingDots size="sm" />
      <span>{label}</span>
    </span>
  );
}
