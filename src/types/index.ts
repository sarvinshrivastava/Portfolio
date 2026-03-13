export interface Project {
  id: string;
  title: string;
  description: string;
  category: 'AI/ML' | 'AR/VR' | 'Web Dev' | 'Tools';
  techStack: string[];
  githubUrl?: string;
  imageUrl?: string;
  date?: string;
  featured: boolean;
  sortOrder: number;
}

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  category: 'Education' | 'Achievement' | 'Milestone' | 'Leadership';
  sortOrder: number;
}

export interface Experience {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate?: string;
  location: string;
  description: string[];
  techStack: string[];
  sortOrder: number;
}

export interface About {
  bio: string;
  github?: string;
  linkedin?: string;
  x?: string;
  medium?: string;
  email?: string;
  roles: string[];
  resumeUrl?: string;
}

export type Theme = 'dark' | 'light';
export type AccentColor = string;
