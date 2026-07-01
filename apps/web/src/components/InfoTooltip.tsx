interface InfoTooltipProps {
  label: string;
  children: string;
}

export function InfoTooltip({ label, children }: InfoTooltipProps) {
  return (
    <span className="relative inline-flex align-middle group">
      <button
        type="button"
        aria-label={label}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-cro-border text-[10px] font-bold leading-none text-cro-muted transition-colors hover:border-cro-cyan hover:text-cro-cyan focus:outline-none focus:ring-1 focus:ring-cro-cyan"
      >
        i
      </button>
      <span className="pointer-events-none absolute left-1/2 top-6 z-20 hidden w-72 -translate-x-1/2 rounded-lg border border-cro-border bg-cro-dark px-3 py-2 text-left text-xs font-normal leading-relaxed text-cro-text shadow-xl group-hover:block group-focus-within:block">
        {children}
      </span>
    </span>
  );
}
