import { useScrollReveal } from '../../hooks/useScrollReveal';
import { SectionHeading } from '../ui/SectionHeading';
import { useAbout } from '../../context/AboutContext';
import type { About as AboutData } from '../../types';

const LINK_CLASSES =
  'flex items-center gap-3 px-3 py-2 border border-border rounded text-[0.8125rem] text-text-muted transition-all duration-200 hover:opacity-100 hover:text-text hover:border-accent hover:bg-accent-dim';

interface SocialEntry {
  href: string;
  prefix: string;
  label: string;
  external: boolean;
}

function getSocialLinks(data: AboutData): SocialEntry[] {
  return [
    data.github   ? { href: data.github,           prefix: '$ git clone', label: 'GitHub',      external: true  } : null,
    data.linkedin ? { href: data.linkedin,          prefix: '$ connect',   label: 'LinkedIn',    external: true  } : null,
    data.x        ? { href: data.x,                 prefix: '$ follow',    label: 'X / Twitter', external: true  } : null,
    data.medium   ? { href: data.medium,            prefix: '$ read',      label: 'Medium',      external: true  } : null,
    data.email    ? { href: `mailto:${data.email}`, prefix: '$ mail',      label: data.email,    external: false } : null,
  ].filter((x): x is SocialEntry => x !== null);
}

export function About() {
  const data = useAbout();
  const ref = useScrollReveal<HTMLElement>();

  return (
    <section
      ref={ref}
      id="about"
      className="reveal-section py-24"
      aria-label="About me"
      data-keynav-section
    >
      <div className="container">
        <SectionHeading prefix="## about" title="Who I Am" />

        {!data && <p className="text-muted font-mono">$ loading...</p>}

        {data && (
          <div className="grid grid-cols-[360px_1fr] gap-16 items-start max-[900px]:grid-cols-1 max-[900px]:gap-10">
            <div className="flex flex-col gap-6 max-[900px]:max-w-[320px]">
              <img
                src="/profile-pic.webp"
                alt="Sarvin Shrivastava"
                className="w-full aspect-square object-cover object-top rounded-md border border-border grayscale-[20%]"
              />
              <div className="flex flex-col gap-2">
                {getSocialLinks(data).map(({ href, prefix, label, external }) => (
                  <a
                    key={href}
                    href={href}
                    {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className={LINK_CLASSES}
                  >
                    <span className="font-mono text-accent text-xs min-w-[70px]">{prefix}</span>
                    <span>{label}</span>
                  </a>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-8 pt-2">
              <p className="text-[1.0625rem] leading-[1.8] text-text">{data.bio}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
