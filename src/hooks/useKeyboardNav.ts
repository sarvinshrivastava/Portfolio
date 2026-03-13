import { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

type NavMode = 'idle' | 'section' | 'element';

const PAGES = ['/', '/projects', '/my-journey', '/experience'];

interface UseKeyboardNavOptions {
  onThemeToggle: () => void;
  resumeUrl?: string;
}

export function useKeyboardNav({ onThemeToggle, resumeUrl }: UseKeyboardNavOptions) {
  const [showHelp, setShowHelp] = useState(false);
  const [mode, setMode] = useState<NavMode>('idle');
  const [sectionIndex, setSectionIndex] = useState(0);
  const [elementIndex, setElementIndex] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  // Refs so the single event listener always reads current values without stale closures
  const stateRef = useRef({ mode, sectionIndex, elementIndex, showHelp, pathname: location.pathname });
  const resumeRef = useRef(resumeUrl);
  const toggleRef = useRef(onThemeToggle);

  // Sync refs after each render (useLayoutEffect = before paint, safe for event handlers)
  useLayoutEffect(() => {
    stateRef.current = { mode, sectionIndex, elementIndex, showHelp, pathname: location.pathname };
    resumeRef.current = resumeUrl;
    toggleRef.current = onThemeToggle;
  }, [mode, sectionIndex, elementIndex, showHelp, location.pathname, resumeUrl, onThemeToggle]);

  // Reset on page change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode('idle');
    setSectionIndex(0);
    setElementIndex(0);
    document.querySelectorAll('.keynav-focused').forEach(el => el.classList.remove('keynav-focused'));
  }, [location.pathname]);

  // Register a single persistent listener; uses refs for all mutable values
  useEffect(() => {
    const removeFocus = () =>
      document.querySelectorAll('.keynav-focused').forEach(el => el.classList.remove('keynav-focused'));

    const getSections = (): Element[] =>
      Array.from(document.querySelectorAll('[data-keynav-section]'));

    const getElements = (section: Element): Element[] =>
      Array.from(section.querySelectorAll('[data-keynav-element]'));

    const applyFocusSection = (idx: number, sections: Element[]) => {
      removeFocus();
      const el = sections[idx];
      if (!el) return;
      el.classList.add('keynav-focused');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const applyFocusElement = (secIdx: number, elIdx: number, sections: Element[]) => {
      removeFocus();
      const section = sections[secIdx];
      if (!section) return;
      const elements = getElements(section);
      const el = elements[elIdx] as HTMLElement | undefined;
      if (!el) return;
      el.classList.add('keynav-focused');
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      // Only call .focus() on non-interactive elements; inputs will focus themselves
      if (!['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(el.tagName)) {
        el.focus?.();
      }
    };

    const handler = (e: KeyboardEvent) => {
      // Block any shortcut that has a modifier key (cmd+r, ctrl+r, etc.)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      // Let inputs handle all keys except Escape
      if (isInput && e.key !== 'Escape') return;

      const { mode, sectionIndex, elementIndex, showHelp, pathname } = stateRef.current;
      const sections = getSections();

      switch (e.key) {
        case 'ArrowLeft': {
          e.preventDefault();
          const idx = PAGES.indexOf(pathname);
          const prev = PAGES[Math.max(0, idx - 1)];
          if (prev && prev !== pathname) navigate(prev);
          break;
        }

        case 'ArrowRight': {
          e.preventDefault();
          const idx = PAGES.indexOf(pathname);
          const next = PAGES[Math.min(PAGES.length - 1, idx + 1)];
          if (next && next !== pathname) navigate(next);
          break;
        }

        case 'j':
        case 'ArrowDown': {
          // ArrowDown in idle → let the browser scroll naturally
          if (e.key === 'ArrowDown' && mode === 'idle') break;
          e.preventDefault();

          if (mode === 'idle') {
            // j in idle → enter section mode at first section
            if (sections.length === 0) break;
            setMode('section');
            setSectionIndex(0);
            applyFocusSection(0, sections);
          } else if (mode === 'section') {
            const section = sections[sectionIndex];
            const elements = section ? getElements(section) : [];
            if (elements.length > 0) {
              // Section has elements → drop into element mode
              setMode('element');
              setElementIndex(0);
              applyFocusElement(sectionIndex, 0, sections);
            } else if (sectionIndex < sections.length - 1) {
              // No elements, advance to next section
              const next = sectionIndex + 1;
              setSectionIndex(next);
              applyFocusSection(next, sections);
            } else {
              // At last section with no elements → scroll page
              window.scrollBy({ top: 300, behavior: 'smooth' });
            }
          } else if (mode === 'element') {
            const section = sections[sectionIndex];
            const elements = section ? getElements(section) : [];
            if (elementIndex < elements.length - 1) {
              const next = elementIndex + 1;
              setElementIndex(next);
              applyFocusElement(sectionIndex, next, sections);
            } else if (sectionIndex < sections.length - 1) {
              // Last element in section → move to next section
              const next = sectionIndex + 1;
              setMode('section');
              setSectionIndex(next);
              setElementIndex(0);
              applyFocusSection(next, sections);
            } else {
              // Last element of last section → scroll page
              window.scrollBy({ top: 300, behavior: 'smooth' });
            }
          }
          break;
        }

        case 'k':
        case 'ArrowUp': {
          // ArrowUp in idle → let the browser scroll naturally
          if (e.key === 'ArrowUp' && mode === 'idle') break;
          e.preventDefault();

          if (mode === 'section') {
            if (sectionIndex > 0) {
              const prev = sectionIndex - 1;
              // If previous section has elements, enter element mode at its last element
              const prevSection = sections[prev];
              const prevElements = prevSection ? getElements(prevSection) : [];
              if (prevElements.length > 0) {
                setMode('element');
                setSectionIndex(prev);
                const lastEl = prevElements.length - 1;
                setElementIndex(lastEl);
                applyFocusElement(prev, lastEl, sections);
              } else {
                setSectionIndex(prev);
                applyFocusSection(prev, sections);
              }
            } else {
              // At first section → exit to idle
              setMode('idle');
              removeFocus();
              window.scrollBy({ top: -300, behavior: 'smooth' });
            }
          } else if (mode === 'element') {
            if (elementIndex > 0) {
              const prev = elementIndex - 1;
              setElementIndex(prev);
              applyFocusElement(sectionIndex, prev, sections);
            } else {
              // At first element → back to section highlight
              setMode('section');
              applyFocusSection(sectionIndex, sections);
            }
          }
          break;
        }

        case 'Enter': {
          if (mode === 'section') {
            // Enter on a section that has elements → jump to first element
            const section = sections[sectionIndex];
            const elements = section ? getElements(section) : [];
            if (elements.length > 0) {
              e.preventDefault();
              setMode('element');
              setElementIndex(0);
              applyFocusElement(sectionIndex, 0, sections);
            }
          } else if (mode === 'element') {
            e.preventDefault();
            const section = sections[sectionIndex];
            const elements = section ? getElements(section) : [];
            const el = elements[elementIndex] as HTMLElement | undefined;
            el?.click();
          }
          break;
        }

        case 'Escape': {
          if (showHelp) {
            setShowHelp(false);
          } else if (mode === 'element') {
            setMode('section');
            applyFocusSection(sectionIndex, sections);
          } else if (mode === 'section') {
            setMode('idle');
            removeFocus();
          }
          break;
        }

        case 'd': {
          e.preventDefault();
          toggleRef.current();
          break;
        }

        case 'r': {
          // Only 'r' alone — modifiers already blocked above
          if (resumeRef.current) {
            e.preventDefault();
            window.open(resumeRef.current, '_blank');
          }
          break;
        }

        case 'h': {
          e.preventDefault();
          setShowHelp(v => !v);
          break;
        }

        case '/': {
          e.preventDefault();
          // Focus the first button inside the filter container
          const filterContainer = document.querySelector('[data-keynav-filter]');
          const firstBtn = filterContainer?.querySelector('button') as HTMLElement | null;
          (firstBtn ?? (filterContainer as HTMLElement | null))?.focus();
          break;
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]); // only re-register if navigate changes (practically never)

  return { showHelp, setShowHelp };
}
