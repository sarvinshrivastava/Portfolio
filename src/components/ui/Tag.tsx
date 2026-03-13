interface TagProps {
  label: string;
  variant?: 'default' | 'accent' | 'dim';
}

const variantClasses: Record<string, string> = {
  default: 'bg-bg-tertiary text-text-muted border border-border',
  accent: 'bg-accent-dim text-accent border border-[rgba(245,166,35,0.25)]',
  dim: 'bg-transparent text-text-subtle border border-text-subtle',
};

export function Tag({ label, variant = 'default' }: TagProps) {
  return (
    <span className={`inline-block font-mono text-[0.6875rem] px-[0.6em] py-[0.2em] rounded tracking-[0.04em] whitespace-nowrap ${variantClasses[variant]}`}>
      {label}
    </span>
  );
}
