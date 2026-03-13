import { useEffect, useState } from 'react';
import { fetchTimeline } from '../services/notion';
import { SectionHeading } from '../components/ui/SectionHeading';
import { Tag } from '../components/ui/Tag';
import type { TimelineEvent } from '../types';

const CATEGORY_COLOR: Record<string, string> = {
  Education: '#60a5fa',
  Achievement: '#f472b6',
  Milestone: '#F5A623',
  Leadership: '#34d399',
};

export function MyJourney() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimeline()
      .then(setEvents)
      .finally(() => setLoading(false));
  }, []);

  return (
    <main id="main" className="pt-28 pb-16 min-h-screen" data-keynav-section>
      <div className="container">
        <SectionHeading
          prefix="## my-journey"
          title="The Story So Far"
          subtitle="Milestones, education, and the moments that shaped me."
        />

        {loading && <p className="text-muted font-mono">$ loading...</p>}

        <div className="timeline-track">
          {events.map((event, i) => {
            const isLeft = i % 2 === 0;
            return (
              <div key={event.id} className="tl-item">
                {isLeft ? (
                  <>
                    <article className="tl-card-left bg-bg-secondary border border-border rounded-md p-5 flex flex-col gap-2 transition-colors duration-200 hover:border-accent">
                      <div className="tl-card-top flex items-center gap-2 flex-wrap">
                        <Tag label={event.category} />
                        <time className="font-mono text-xs text-text-muted">{event.date}</time>
                      </div>
                      <h2 className="font-mono text-[0.9rem] font-bold text-text">{event.title}</h2>
                      <p className="text-[0.8375rem] text-text-muted leading-relaxed">{event.description}</p>
                    </article>
                    <div className="tl-connector-left flex justify-center pt-4">
                      <div
                        className="w-3 h-3 rounded-full border-2 bg-bg shrink-0"
                        style={{ borderColor: CATEGORY_COLOR[event.category] ?? 'var(--accent)' }}
                      />
                    </div>
                    <div />
                  </>
                ) : (
                  <>
                    <div />
                    <div className="tl-connector-right flex justify-center pt-4">
                      <div
                        className="w-3 h-3 rounded-full border-2 bg-bg shrink-0"
                        style={{ borderColor: CATEGORY_COLOR[event.category] ?? 'var(--accent)' }}
                      />
                    </div>
                    <article className="tl-card-right bg-bg-secondary border border-border rounded-md p-5 flex flex-col gap-2 transition-colors duration-200 hover:border-accent">
                      <div className="tl-card-top flex items-center gap-2 flex-wrap">
                        <Tag label={event.category} />
                        <time className="font-mono text-xs text-text-muted">{event.date}</time>
                      </div>
                      <h2 className="font-mono text-[0.9rem] font-bold text-text">{event.title}</h2>
                      <p className="text-[0.8375rem] text-text-muted leading-relaxed">{event.description}</p>
                    </article>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
