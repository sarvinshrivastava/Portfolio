interface SectionHeadingProps {
  prefix?: string;
  title: string;
  subtitle?: string;
  /** `h1` for a page's own heading (Projects, Experience, My Journey); sections stay `h2`. */
  as?: 'h1' | 'h2';
}

export function SectionHeading({ prefix = '##', title, subtitle, as: Heading = 'h2' }: SectionHeadingProps) {
  return (
    <div className="mb-12">
      <p className="font-mono text-[0.8125rem] text-accent mb-2 tracking-[0.04em]">{prefix}</p>
      <Heading className="font-mono text-[clamp(1.75rem,4vw,2.5rem)] font-bold text-text leading-[1.15] tracking-[-0.03em]">{title}</Heading>
      {subtitle && <p className="mt-3 text-[0.9375rem] text-text-muted max-w-[540px]">{subtitle}</p>}
    </div>
  );
}
