import { useEffect, useState } from 'react';
import { fetchExperience } from '../services/notion';
import { SectionHeading } from '../components/ui/SectionHeading';
import { Tag } from '../components/ui/Tag';
import type { Experience as ExperienceData } from '../types';

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Present';
  const [year, month] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(month) - 1]} ${year}`;
}

export function Experience() {
  const [experiences, setExperiences] = useState<ExperienceData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExperience()
      .then(setExperiences)
      .finally(() => setLoading(false));
  }, []);

  return (
    <main id="main" className="pt-28 pb-16 min-h-screen" data-keynav-section>
      <div className="container">
        <SectionHeading
          prefix="## experience"
          title="Where I've Worked"
          subtitle="Internships, leadership roles, and real-world impact."
        />

        {loading && <p className="text-muted font-mono">$ loading...</p>}

        <div className="flex flex-col gap-6">
          {experiences.map(exp => (
            <article
              key={exp.id}
              className="grid grid-cols-[180px_1fr] gap-8 bg-bg-secondary border border-border rounded-md p-7 transition-colors duration-200 hover:border-accent max-[700px]:grid-cols-1 max-[700px]:gap-5"
            >
              <div className="border-r border-border pr-8 max-[700px]:border-r-0 max-[700px]:border-b max-[700px]:pr-0 max-[700px]:pb-4">
                <div className="flex flex-col gap-[0.4rem]">
                  <time className="font-mono text-xs text-accent leading-[1.5]">
                    {formatDate(exp.startDate)} — {formatDate(exp.endDate)}
                  </time>
                  <span className="text-[0.8rem] text-text-muted">{exp.location}</span>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-[0.2rem]">
                  <h2 className="font-mono text-[1.1rem] font-bold text-text">{exp.company}</h2>
                  <span className="text-sm text-text-muted">{exp.role}</span>
                </div>
                <ul className="list-none flex flex-col gap-2">
                  {exp.description.map((line, i) => (
                    <li key={i} className="flex gap-[0.6rem] text-[0.9rem] text-text leading-relaxed">
                      <span className="text-accent shrink-0 mt-[0.1em]" aria-hidden="true">▹</span>
                      {line.replace(/^[•▹-]\s*/, '')}
                    </li>
                  ))}
                </ul>
                {exp.techStack.length > 0 && (
                  <div className="flex flex-wrap gap-[0.35rem] mt-1">
                    {exp.techStack.map(t => <Tag key={t} label={t} />)}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
