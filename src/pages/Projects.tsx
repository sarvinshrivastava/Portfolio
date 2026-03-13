import { useEffect, useState } from 'react';
import { fetchProjects } from '../services/notion';
import { SectionHeading } from '../components/ui/SectionHeading';
import { Tag } from '../components/ui/Tag';
import type { Project } from '../types';

const CATEGORIES = ['All', 'AI/ML', 'AR/VR', 'Web Dev', 'Tools'] as const;

export function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('All');

  useEffect(() => {
    fetchProjects()
      .then(setProjects)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'All' ? projects : projects.filter(p => p.category === filter);

  return (
    <main id="main" className="pt-28 pb-16 min-h-screen" data-keynav-section>
      <div className="container">
        <SectionHeading
          prefix="## projects"
          title="What I've Built"
          subtitle="A mix of tools, AR experiences, and web apps."
        />

        <div className="flex gap-2 flex-wrap mb-10" role="tablist" aria-label="Filter projects by category" data-keynav-filter>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              role="tab"
              aria-selected={filter === cat}
              data-keynav-element
              className={`font-mono text-[0.8125rem] px-4 py-[0.4rem] border rounded cursor-pointer transition-all duration-200 ${
                filter === cat
                  ? 'bg-accent text-black border-accent'
                  : 'bg-transparent text-text-muted border-border hover:text-text hover:border-text-muted'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading && <p className="text-muted font-mono">$ loading...</p>}

        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-6 max-sm:grid-cols-1">
          {filtered.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </main>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <article
      className={`bg-bg-secondary border border-border rounded-md p-6 flex flex-col gap-4 relative transition-all duration-200 hover:border-accent hover:-translate-y-0.5 ${
        project.featured ? 'border-[rgba(245,166,35,0.3)]' : ''
      }`}
    >
      {project.featured && (
        <span className="absolute -top-px right-4 font-mono text-[0.65rem] bg-accent text-black px-2 py-[0.15rem] rounded-b tracking-[0.06em]">
          featured
        </span>
      )}
      <div className="flex justify-between items-start gap-3">
        <h2 className="font-mono text-base font-bold text-text">{project.title}</h2>
        <Tag label={project.category} variant="accent" />
      </div>
      <p className="text-sm text-text-muted leading-relaxed flex-1">{project.description}</p>
      <div className="flex flex-wrap gap-[0.35rem]">
        {project.techStack.map(tech => (
          <Tag key={tech} label={tech} />
        ))}
      </div>
      {project.githubUrl && (
        <a
          href={project.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[0.8125rem] text-text-muted mt-auto transition-colors duration-200 inline-flex items-center gap-1 hover:text-accent hover:opacity-100"
        >
          <span className="font-mono">$ view source</span> →
        </a>
      )}
    </article>
  );
}
