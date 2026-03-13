import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAbout } from '../../services/notion';

export function Hero() {
  const [roles, setRoles] = useState<string[]>([]);
  const [resumeUrl, setResumeUrl] = useState<string | undefined>();
  const [roleIndex, setRoleIndex] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchAbout().then(d => {
      setRoles(d.roles);
      setResumeUrl(d.resumeUrl);
    });
  }, []);

  useEffect(() => {
    if (roles.length === 0) return;
    const target = roles[roleIndex];
    let timeout: ReturnType<typeof setTimeout>;

    if (!deleting && displayed.length < target.length) {
      timeout = setTimeout(() => setDisplayed(target.slice(0, displayed.length + 1)), 60);
    } else if (!deleting && displayed.length === target.length) {
      timeout = setTimeout(() => setDeleting(true), 2000);
    } else if (deleting && displayed.length > 0) {
      timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 35);
    } else if (deleting && displayed.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDeleting(false);
      setRoleIndex(i => (i + 1) % roles.length);
    }

    return () => clearTimeout(timeout);
  }, [displayed, deleting, roleIndex, roles]);

  return (
    <section
      className="min-h-screen flex items-center pt-24 pb-16 max-[480px]:pt-20 max-[480px]:pb-12"
      id="hero"
      aria-label="Introduction"
      data-keynav-section
    >
      <div className="container grid grid-cols-2 gap-16 items-center max-[900px]:grid-cols-1 max-[900px]:gap-10">
        {/* Terminal */}
        <div className="bg-bg-secondary border border-border rounded-lg overflow-hidden font-mono text-sm max-[900px]:-order-1">
          {/* Title bar */}
          <div className="bg-bg-tertiary border-b border-border px-4 py-[0.6rem] flex items-center gap-[0.4rem]">
            <span className="w-3 h-3 rounded-full inline-block bg-[#ff5f57]" />
            <span className="w-3 h-3 rounded-full inline-block bg-[#febc2e]" />
            <span className="w-3 h-3 rounded-full inline-block bg-[#28c840]" />
            <span className="ml-3 text-xs text-text-muted">sarvin@portfolio:~</span>
          </div>
          {/* Body */}
          <div className="px-6 py-5 min-h-[120px]">
            <p className="leading-relaxed">
              <span className="text-accent">➜ ~ </span>
              <span className="text-text">whoami</span>
            </p>
            <p className="pl-4 text-text-muted leading-relaxed min-h-[1.6em]">Sarvin Shrivastava</p>
            <p className="leading-relaxed mt-2">
              <span className="text-accent">➜ ~ </span>
              <span className="text-text">cat roles.txt</span>
            </p>
            <p className="pl-4 text-text-muted leading-relaxed min-h-[1.6em]">
              {displayed}
              <span
                className="text-accent animate-[blink_1s_step-end_infinite]"
                aria-hidden="true"
              >
                ▌
              </span>
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-5">
          <p className="font-mono text-sm text-accent tracking-[0.06em]">Hello, World.</p>
          <h1 className="font-mono text-[clamp(2.5rem,6vw,4rem)] font-bold leading-[1.05] tracking-[-0.04em] text-text">
            Sarvin Shrivastava
          </h1>
          <p className="text-base text-text-muted max-w-[440px] leading-[1.7]">
            I build interfaces, AR experiences, and tools that{' '}
            <span className="text-accent">make developers' lives easier.</span>
          </p>
          <div className="flex gap-4 flex-wrap mt-2">
            <Link
              to="/projects"
              data-keynav-element
              className="inline-flex items-center gap-2 bg-accent text-black font-mono text-sm font-bold px-6 py-3 rounded-[var(--radius)] transition-[opacity,transform] duration-200 ease-in-out hover:opacity-85 hover:-translate-y-px"
            >
              View Projects <span aria-hidden="true">→</span>
            </Link>
            <a
              href="#connect"
              data-keynav-element
              className="inline-flex items-center font-mono text-sm text-text-muted border border-border px-6 py-3 rounded-[var(--radius)] transition-[color,border-color,transform] duration-200 ease-in-out hover:opacity-100 hover:text-text hover:border-text-muted hover:-translate-y-px"
            >
              Get In Touch
            </a>
            {resumeUrl && (
              <a
                href={resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-keynav-element
                className="inline-flex items-center font-mono text-sm text-text-muted border border-border px-6 py-3 rounded transition-all duration-200 hover:opacity-100 hover:text-text hover:border-text-muted hover:-translate-y-px"
              >
                ↓ resume
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
