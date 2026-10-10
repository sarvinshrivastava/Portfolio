import { useScrollReveal } from '../../hooks/useScrollReveal';
import { useHashScroll } from '../../hooks/useHashScroll';
import { SectionHeading } from '../ui/SectionHeading';
import { useAbout } from '../../context/AboutContext';
import { trackSocial } from '../../lib/analytics';
import {
  ABOUT_HEADING,
  BIO,
  PERSON,
  STATIC_ABOUT,
  aboutSocialLinks,
} from '../../content/profile';
import type { About as AboutData } from '../../types';

const LINK_CLASSES =
  'flex items-center gap-3 px-3 py-2 border border-border rounded text-[0.8125rem] text-text-muted transition-all duration-200 hover:opacity-100 hover:text-text hover:border-accent hover:bg-accent-dim';

export function About() {
  const data = useAbout();
  const ref = useScrollReveal<HTMLElement>();
  useHashScroll(ref, '#about');

  // Static copy until Notion answers (or if it never does), so first paint
  // matches the build-time shell. Per field for the bio: an empty or renamed
  // Notion property must not blank a section that was already showing text.
  const shown: AboutData = data ? { ...data, bio: data.bio || BIO } : STATIC_ABOUT;

  return (
    <section
      ref={ref}
      id="about"
      className="reveal-section py-24"
      aria-label="About me"
      data-keynav-section
    >
      <div className="container">
        <SectionHeading {...ABOUT_HEADING} />

        <div className="grid grid-cols-[360px_1fr] gap-16 items-start max-[900px]:grid-cols-1 max-[900px]:gap-10">
          <div className="flex flex-col gap-6 max-[900px]:max-w-[320px]">
            <img
              src={PERSON.image}
              alt={PERSON.name}
              className="w-full aspect-square object-cover object-top rounded-md border border-border grayscale-[20%]"
            />
            <div className="flex flex-col gap-2">
              {aboutSocialLinks(shown).map(({ href, prefix, label, external, network }) => (
                <a
                  key={href}
                  href={href}
                  {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  onClick={trackSocial(network, 'about')}
                  className={LINK_CLASSES}
                >
                  <span className="font-mono text-accent text-xs min-w-[70px]">{prefix}</span>
                  <span>{label}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-8 pt-2">
            <p className="text-[1.0625rem] leading-[1.8] text-text">{shown.bio}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
