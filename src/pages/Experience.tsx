import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchExperience } from '../services/notion';
import { SectionHeading } from '../components/ui/SectionHeading';
import type { Experience as ExperienceData } from '../types';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: 'easeOut' },
  }),
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Present';
  const [year, month] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(month) - 1]} ${year}`;
}

function isCurrentRole(endDate?: string): boolean {
  if (!endDate) return true;
  return new Date() < new Date(endDate);
}

function BulletText({ text, techStack }: { text: string; techStack: string[] }) {
  const clean = text.replace(/^[•▸▹-]\s*/, '');

  // Priority 1: exact tech stack term (most accurate for tech names like Unity, Mixpanel)
  for (const tech of techStack) {
    const idx = clean.indexOf(tech);
    if (idx !== -1) {
      return (
        <>
          {clean.slice(0, idx)}
          <span className="font-mono font-medium text-text text-[15px] tracking-tight">{tech}</span>
          {clean.slice(idx + tech.length)}
        </>
      );
    }
  }

  // Priority 2: number with optional +/k/x suffix + optional following noun (e.g. "10,000+" or "4 products")
  const numMatch = /\d[\d,]*[+kxKX%]?(?:\s+[a-z]\w*)?/.exec(clean);
  if (numMatch) {
    return (
      <>
        {clean.slice(0, numMatch.index)}
        <span className="font-mono font-medium text-text text-[15px] tracking-tight">{numMatch[0]}</span>
        {clean.slice(numMatch.index + numMatch[0].length)}
      </>
    );
  }

  // Priority 3: all-caps acronym (e.g. "AWS CI/CD", "OOP", "C#")
  const capsMatch = /[A-Z]{2,}[A-Z0-9#/]*(?:\s[A-Z][A-Z0-9#/]+)*/.exec(clean);
  if (capsMatch) {
    return (
      <>
        {clean.slice(0, capsMatch.index)}
        <span className="font-mono font-medium text-text text-[15px] tracking-tight">{capsMatch[0]}</span>
        {clean.slice(capsMatch.index + capsMatch[0].length)}
      </>
    );
  }

  return <>{clean}</>;
}

export function Experience() {
  const [experiences, setExperiences] = useState<ExperienceData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExperience()
      .then(data => {
        data.sort((a, b) =>
          a.sortOrder !== b.sortOrder
            ? a.sortOrder - b.sortOrder
            : b.startDate.localeCompare(a.startDate),
        );
        setExperiences(data);
      })
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

        {loading && <p className="text-text-muted font-mono text-sm">$ loading...</p>}

        <div className="flex flex-col gap-3">
          {experiences.map((exp, i) => (
            <motion.article
              key={exp.id}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              className="bg-bg-secondary border border-white/[0.08] rounded-xl p-7"
            >
              {/* Header row */}
              <div className="flex justify-between items-start gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-medium font-mono tracking-tight text-text">{exp.company}</h2>
                  <p className="text-xs text-text-muted font-sans mt-[3px]">{exp.role}</p>
                  {isCurrentRole(exp.endDate) && (
                    <div className="flex items-center gap-1 mt-[6px]">
                      <span
                        className="w-[5px] h-[5px] rounded-full bg-[#1D9E75] animate-pulse inline-block"
                        aria-hidden="true"
                      />
                      <span className="text-[10px] text-[#1D9E75] font-mono">currently here</span>
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-mono text-accent">
                    {formatDate(exp.startDate)} → {formatDate(exp.endDate)}
                  </p>
                  <p className="text-xs text-text-muted font-sans mt-[2px]">{exp.location}</p>
                </div>
              </div>

              {/* Bullets */}
              <div className="flex flex-col gap-[9px] mb-5">
                {exp.description.map((line, j) => (
                  <p key={j} className="text-sm text-text-muted font-sans leading-relaxed pl-4 relative">
                    <span className="absolute left-0 top-[3px] text-accent text-[11px]" aria-hidden="true">▸</span>
                    <BulletText text={line} techStack={exp.techStack} />
                  </p>
                ))}
              </div>

              {/* Tech stack */}
              {exp.techStack.length > 0 && (
                <div className="flex flex-wrap gap-[5px] pt-3 border-t border-white/[0.08]">
                  {exp.techStack.map(t => (
                    <span
                      key={t}
                      className="text-[10px] font-mono px-2 py-0.5 border border-white/[0.12] rounded-sm text-text-muted tracking-[0.02em]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </motion.article>
          ))}
        </div>
      </div>
    </main>
  );
}
