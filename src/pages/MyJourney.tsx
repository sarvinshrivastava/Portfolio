import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchTimeline } from '../services/notion';
import { SectionHeading } from '../components/ui/SectionHeading';
import type { TimelineEvent } from '../types';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: 'easeOut' },
  }),
};

const NODE_COLOR: Record<string, { border: string; fill?: string }> = {
  Education:   { border: '#378ADD' },
  Leadership:  { border: '#1D9E75' },
  Achievement: { border: '#D4537E', fill: '#D4537E' },
  Milestone:   { border: '#F5A623', fill: '#F5A623' },
};

const BADGE_STYLE: Record<string, { bg: string; color: string }> = {
  Education:   { bg: '#E6F1FB', color: '#0C447C' },
  Leadership:  { bg: '#E1F5EE', color: '#085041' },
  Achievement: { bg: '#FBEAF0', color: '#72243E' },
  Milestone:   { bg: '#FAEEDA', color: '#633806' },
};

const COMMIT_SCOPE: Record<string, string> = {
  Education:   'init(edu)',
  Leadership:  'feat(lead)',
  Achievement: 'release',
  Milestone:   'feat',
};

const FOOTER_COLORS: Record<string, string> = {
  education:   '#378ADD',
  leadership:  '#1D9E75',
  achievement: '#D4537E',
  milestone:   '#F5A623',
};

function fakeHash(id: string): string {
  return id.replace(/-/g, '').slice(0, 7);
}

export function MyJourney() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetchTimeline()
      .then(data => {
        data.sort((a, b) => a.sortOrder - b.sortOrder);
        setEvents(data);
      })
      .finally(() => setLoading(false));
  }, []);

  function toggleExpand(id: string) {
    setExpanded(prev => (prev === id ? null : id));
  }

  return (
    <main id="main" className="pt-28 pb-16 min-h-screen" data-keynav-section>
      <div className="container">
        <SectionHeading
          prefix="## my-journey"
          title="The Story So Far"
          subtitle="Milestones, education, and the moments that shaped me."
        />

        {loading && <p className="text-text-muted font-mono text-sm">$ loading...</p>}

        <div className="max-w-[680px] mx-auto bg-bg-secondary border border-border rounded-lg overflow-hidden font-mono text-xs">
          {/* Title bar */}
          <div className="bg-bg-tertiary border-b border-border px-4 py-[0.6rem] flex items-center gap-[0.4rem]">
            <span className="w-3 h-3 rounded-full inline-block bg-[#ff5f57]" />
            <span className="w-3 h-3 rounded-full inline-block bg-[#febc2e]" />
            <span className="w-3 h-3 rounded-full inline-block bg-[#28c840]" />
            <span className="ml-3 text-xs text-text-muted">sarvin@portfolio:~/journey</span>
          </div>

          {/* Terminal body */}
          <div className="px-5 py-4">
            {/* Terminal prompt */}
            <div className="flex flex-wrap gap-x-[6px] items-baseline mb-4 text-text-muted">
              <span className="text-[#1D9E75]">sarvin</span>
              <span>@portfolio</span>
              <span className="text-accent">~/journey</span>
              <span>$</span>
              <span className="text-text">git log --graph --oneline --all</span>
              <span className="inline-block w-[6px] h-[12px] bg-text align-[-2px] animate-[blink_1s_steps(1)_infinite]" />
            </div>

            {/* Commit list */}
            <div>
              {events.map((event, i) => {
                const node = NODE_COLOR[event.category] ?? NODE_COLOR.Milestone;
                const badge = BADGE_STYLE[event.category] ?? BADGE_STYLE.Milestone;
                const scope = COMMIT_SCOPE[event.category] ?? 'feat';
                const isLast = i === events.length - 1;
                const isOpen = expanded === event.id;

                return (
                  <motion.div
                    key={event.id}
                    custom={i}
                    initial="hidden"
                    animate="visible"
                    variants={fadeInUp}
                    className="grid gap-x-2 cursor-pointer rounded-sm px-1 py-1 transition-colors duration-100 hover:bg-white/[0.04]"
                    style={{ gridTemplateColumns: '20px 1fr' }}
                    onClick={() => toggleExpand(event.id)}
                    role="button"
                    aria-expanded={isOpen}
                    tabIndex={0}
                    onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && toggleExpand(event.id)}
                  >
                    {/* Graph column */}
                    <div className="relative flex flex-col items-center pt-1">
                      <div
                        className="absolute left-1/2 -translate-x-1/2 w-px bg-white/[0.13]"
                        style={{ top: 0, bottom: isLast ? '50%' : '-4px' }}
                      />
                      <div
                        className="w-2 h-2 rounded-full relative z-10 flex-shrink-0"
                        style={{
                          border: `1.5px solid ${node.border}`,
                          backgroundColor: node.fill ?? 'var(--bg-secondary)',
                        }}
                      />
                    </div>

                    {/* Commit body */}
                    <div className="pb-[2px]">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-[1px]">
                        <span className="text-accent font-medium text-[11px]">{fakeHash(event.id)}</span>
                        <span className="text-text-muted text-[10px]">{event.date}</span>
                        <span
                          className="text-[10px] font-medium px-1.5 rounded-full"
                          style={{ backgroundColor: badge.bg, color: badge.color }}
                        >
                          {event.category.toLowerCase()}
                        </span>
                      </div>
                      <div className="text-text-muted text-xs">
                        <span className="text-[#378ADD]">{scope}:</span>{' '}
                        {event.title}
                      </div>
                      {isOpen && event.description && (
                        <div className="mt-1 text-[11px] text-text-muted leading-relaxed max-w-[500px]">
                          → {event.description.replace(/\n/g, ' · ')}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Footer — no blinking cursor */}
            {events.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/[0.08] text-[11px] text-text-muted flex flex-wrap items-center gap-x-[4px]">
                <span>{events.length} commits</span>
                {Object.entries(FOOTER_COLORS).map(([cat, color]) => (
                  <span key={cat}>
                    <span style={{ color: 'var(--text-muted)' }}> · </span>
                    <span style={{ color }}>{cat}</span>
                  </span>
                ))}
                <span> · HEAD</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
