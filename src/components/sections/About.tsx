import { useEffect, useState } from 'react';
import { fetchAbout } from '../../services/notion';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { SectionHeading } from '../ui/SectionHeading';
import type { About as AboutData } from '../../types';

export function About() {
  const [data, setData] = useState<AboutData | null>(null);
  const [loading, setLoading] = useState(true);
  const ref = useScrollReveal<HTMLElement>();

  useEffect(() => {
    fetchAbout()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

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

        {loading && <p className="text-muted font-mono">$ loading...</p>}

        {data && (
          <div className="grid grid-cols-[360px_1fr] gap-16 items-start max-[900px]:grid-cols-1 max-[900px]:gap-10">
            <div className="flex flex-col gap-6 max-[900px]:max-w-[320px]">
              <img
                src="/profile-pic.webp"
                alt="Sarvin Shrivastava"
                className="w-full aspect-square object-cover object-top rounded-md border border-border grayscale-[20%]"
              />
              <div className="flex flex-col gap-2">
                {data.github && (
                  <a
                    href={data.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-2 border border-border rounded text-[0.8125rem] text-text-muted transition-all duration-200 hover:opacity-100 hover:text-text hover:border-accent hover:bg-accent-dim"
                  >
                    <span className="font-mono text-accent text-xs min-w-[70px]">$ git clone</span>
                    <span>GitHub</span>
                  </a>
                )}
                {data.linkedin && (
                  <a
                    href={data.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-2 border border-border rounded text-[0.8125rem] text-text-muted transition-all duration-200 hover:opacity-100 hover:text-text hover:border-accent hover:bg-accent-dim"
                  >
                    <span className="font-mono text-accent text-xs min-w-[70px]">$ connect</span>
                    <span>LinkedIn</span>
                  </a>
                )}
                {data.x && (
                  <a
                    href={data.x}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-2 border border-border rounded text-[0.8125rem] text-text-muted transition-all duration-200 hover:opacity-100 hover:text-text hover:border-accent hover:bg-accent-dim"
                  >
                    <span className="font-mono text-accent text-xs min-w-[70px]">$ follow</span>
                    <span>X / Twitter</span>
                  </a>
                )}
                {data.medium && (
                  <a
                    href={data.medium}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-2 border border-border rounded text-[0.8125rem] text-text-muted transition-all duration-200 hover:opacity-100 hover:text-text hover:border-accent hover:bg-accent-dim"
                  >
                    <span className="font-mono text-accent text-xs min-w-[70px]">$ read</span>
                    <span>Medium</span>
                  </a>
                )}
                {data.email && (
                  <a
                    href={`mailto:${data.email}`}
                    className="flex items-center gap-3 px-3 py-2 border border-border rounded text-[0.8125rem] text-text-muted transition-all duration-200 hover:opacity-100 hover:text-text hover:border-accent hover:bg-accent-dim"
                  >
                    <span className="font-mono text-accent text-xs min-w-[70px]">$ mail</span>
                    <span>{data.email}</span>
                  </a>
                )}
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
