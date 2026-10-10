import { useAbout } from '../../context/AboutContext';
import { trackSocial } from '../../lib/analytics';
import { PROFILES } from '../../content/profile';

export function Footer() {
  const about = useAbout();
  const githubUrl = about?.github ?? PROFILES.github;
  const linkedinUrl = about?.linkedin ?? PROFILES.linkedin;

  return (
    <footer className="border-t border-border mt-24 py-8">
      <div className="container flex justify-between items-center flex-wrap gap-2 text-[0.8125rem]">
        <span>
          <span className="text-accent font-mono">~/sarvin</span>
          <span className="text-muted"> — built with React + Vite</span>
        </span>
        <span>
          {/* Plain anchor, not a router Link: react-router does not scroll to a
              hash, and from another route this is a full load of / anyway. */}
          <a href="/#about" className="font-mono">
            about
          </a>
          {' · '}
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={trackSocial('github', 'footer')}
            className="font-mono"
          >
            github
          </a>
          {' · '}
          <a
            href={linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={trackSocial('linkedin', 'footer')}
            className="font-mono"
          >
            linkedin
          </a>
        </span>
      </div>
    </footer>
  );
}
