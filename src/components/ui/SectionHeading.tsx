interface SectionHeadingProps {
  prefix?: string;
  title: string;
  subtitle?: string;
}

export function SectionHeading({ prefix = '##', title, subtitle }: SectionHeadingProps) {
  return (
    <div className="mb-12">
      <p className="font-mono text-[0.8125rem] text-accent mb-2 tracking-[0.04em]">{prefix}</p>
      <h2 className="font-mono text-[clamp(1.75rem,4vw,2.5rem)] font-bold text-text leading-[1.15] tracking-[-0.03em]">{title}</h2>
      {subtitle && <p className="mt-3 text-[0.9375rem] text-text-muted max-w-[540px]">{subtitle}</p>}
    </div>
  );
}
