export function Footer() {
  return (
    <footer className="border-t border-border mt-24 py-8">
      <div className="container flex justify-between items-center flex-wrap gap-2 text-[0.8125rem]">
        <span>
          <span className="text-accent font-mono">~/sarvin</span>
          <span className="text-muted"> — built with React + Vite</span>
        </span>
        <span>
          <a
            href="https://github.com/sarvinshrivastava"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono"
          >
            github
          </a>
          {' · '}
          <a
            href="https://linkedin.com/in/sarvin-shrivastava"
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
