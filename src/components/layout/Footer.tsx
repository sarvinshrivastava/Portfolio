import { useAbout } from '../../context/AboutContext';

export function Footer() {
  const about = useAbout();
  const githubUrl = about?.github ?? 'https://github.com/sarvinshrivastava';
  const linkedinUrl = about?.linkedin ?? 'https://linkedin.com/in/sarvin-shrivastava';

  return (
    <footer className="border-t border-border mt-24 py-8">
      <div className="container flex justify-between items-center flex-wrap gap-2 text-[0.8125rem]">
        <span>
          <span className="text-accent font-mono">~/sarvin</span>
          <span className="text-muted"> — built with React + Vite</span>
        </span>
        <span>
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono"
          >
            github
          </a>
          {' · '}
          <a
            href={linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono"
          >
            linkedin
          </a>
        </span>
      </div>
    </footer>
  );
}
