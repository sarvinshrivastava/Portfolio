import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import type { Theme } from '../../types';

interface NavbarProps {
  theme: Theme;
  onThemeToggle: () => void;
  resumeUrl?: string;
}

const NAV_LINKS = [
  { to: '/', label: 'Home', exact: true },
  { to: '/projects', label: 'Projects' },
  { to: '/my-journey', label: 'My Journey' },
  { to: '/experience', label: 'Experience' },
];

export function Navbar({ theme, onThemeToggle, resumeUrl }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
  }, [location]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-100 transition-[background,border-color] border-b ${
        scrolled
          ? 'bg-bg border-border backdrop-blur-sm'
          : 'border-transparent'
      }`}
    >
      <nav className="container flex items-center justify-between h-16" aria-label="Main navigation">
        <NavLink
          to="/"
          className="font-mono text-base font-bold text-text tracking-tight hover:opacity-100"
          aria-label="Sarvin Shrivastava — home"
        >
          <span className="text-accent">~/</span>sarvin
        </NavLink>

        {/* Desktop links */}
        <ul className="hidden md:flex list-none gap-8" role="list">
          {NAV_LINKS.map(({ to, label, exact }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={exact}
                className={({ isActive }) =>
                  `nav-link relative font-mono text-[0.8125rem] tracking-wide transition-colors ${
                    isActive ? 'active text-text' : 'text-text-muted hover:text-text'
                  }`
                }
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-4">
          {resumeUrl && (
            <a
              href={resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Download resume"
              className="hidden md:flex bg-transparent border border-border text-text-muted text-xs font-mono px-3 h-9 rounded items-center gap-1 transition-[color,border-color] hover:text-accent hover:border-accent"
            >
              ↓ cv
            </a>
          )}
          <button
            onClick={onThemeToggle}
            className="bg-transparent border border-border text-text-muted text-base w-9 h-9 rounded cursor-pointer transition-[color,border-color] flex items-center justify-center hover:text-accent hover:border-accent"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? '○' : '●'}
          </button>

          {/* Hamburger */}
          <button
            className="flex md:hidden flex-col gap-[5px] bg-transparent border-none cursor-pointer p-1"
            onClick={() => setMenuOpen(o => !o)}
            aria-expanded={menuOpen}
            aria-label="Toggle menu"
          >
            <span className="block w-[22px] h-0.5 bg-text rounded-sm transition-all" />
            <span className="block w-[22px] h-0.5 bg-text rounded-sm transition-all" />
            <span className="block w-[22px] h-0.5 bg-text rounded-sm transition-all" />
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="bg-bg-secondary border-b border-border py-4" role="dialog" aria-label="Mobile menu">
          <ul role="list">
            {NAV_LINKS.map(({ to, label, exact }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={exact}
                  className={({ isActive }) =>
                    `block px-6 py-3 font-mono text-[0.9rem] transition-[color,background] ${
                      isActive
                        ? 'text-text bg-bg-tertiary'
                        : 'text-text-muted hover:text-text hover:bg-bg-tertiary'
                    }`
                  }
                >
                  <span className="text-accent">$ </span>{label}
                </NavLink>
              </li>
            ))}
            {resumeUrl && (
              <li>
                <a
                  href={resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-6 py-3 font-mono text-[0.9rem] text-text-muted transition-[color,background] hover:text-text hover:bg-bg-tertiary"
                >
                  <span className="text-accent">$ </span>↓ resume
                </a>
              </li>
            )}
          </ul>
        </div>
      )}
    </header>
  );
}
