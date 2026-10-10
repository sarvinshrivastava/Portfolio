import { useScrollReveal } from '../../hooks/useScrollReveal';
import { useHashScroll } from '../../hooks/useHashScroll';
import { SectionHeading } from '../ui/SectionHeading';
import {
  CERTIFICATIONS,
  CREDENTIALS_HEADING,
  RECOMMENDATIONS,
  monthYear,
} from '../../content/profile';

/**
 * Recommendations and certifications. The static shell renders the same
 * markup at build time (`credentialsSection` in src/seo/site.ts) so crawlers
 * see it; keep the two class sets in step. Quotes are verbatim; never edit them.
 */
export function Credentials() {
  const ref = useScrollReveal<HTMLElement>();
  useHashScroll(ref, '#credentials');

  return (
    <section
      ref={ref}
      id="credentials"
      className="reveal-section py-24"
      aria-label="Recommendations and certifications"
      data-keynav-section
    >
      <div className="container">
        <SectionHeading {...CREDENTIALS_HEADING} />

        <div className="grid grid-cols-2 gap-6 max-[900px]:grid-cols-1">
          {RECOMMENDATIONS.map(rec => (
            <figure
              key={rec.name}
              className="bg-bg-secondary border border-border rounded-lg p-6 flex flex-col gap-4"
            >
              <blockquote className="text-text text-[0.9375rem] leading-[1.7]">
                “{rec.text}”
              </blockquote>
              <figcaption className="font-mono text-[0.8125rem]">
                <span className="text-text">{rec.name}</span>
                <span className="text-text-muted">
                  {' '}
                  — {rec.role}, {rec.relation} · {monthYear(rec.date)}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>

        <h3 className="font-mono text-sm text-accent mt-12 mb-4">$ ls certifications/</h3>
        <ul className="grid grid-cols-2 gap-x-8 gap-y-4 max-[900px]:grid-cols-1" role="list">
          {CERTIFICATIONS.map(cert => (
            <li key={cert.name} className="flex flex-col gap-1">
              <span className="text-text text-[0.9375rem]">{cert.name}</span>
              <span className="font-mono text-xs text-text-muted">
                {cert.issuer} · {monthYear(cert.date)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
